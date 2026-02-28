---
title: "bun:sqlite 실전 가이드 — WAL의 함정과 트러블슈팅"
description: "bun:sqlite WAL 모드의 실전 트러블슈팅 — Docker Volume이 끝없이 커지는 문제의 원인과 해결"
pubDate: "2026-02-23"
---

Bun 런타임을 쓰는 백엔드에서 SQLite를 데이터베이스로 선택하는 팀이 늘고 있다. `bun:sqlite`는 Bun에 네이티브로 내장된 SQLite 바인딩으로, 별도 패키지 설치 없이 바로 쓸 수 있다. 빠르고 간편하다.

하지만 프로덕션에서 돌리다 보면 반드시 만나는 문제가 있다. **WAL 파일이 끝없이 커진다.** 이 글은 `bun:sqlite`의 장점과 주의점, 그리고 실제로 WAL 관련 트러블슈팅을 했던 경험을 정리한 것이다.

---

## bun:sqlite가 좋은 이유

### 제로 의존성

Node.js에서 SQLite를 쓰려면 `better-sqlite3`를 설치해야 한다. C++ 애드온이라 `node-gyp` 빌드가 필요하고, OS별 호환성 문제가 생긴다. Alpine Linux Docker 이미지에서 빌드가 깨지는 건 클래식한 삽질이다.

`bun:sqlite`는 Bun 바이너리에 포함되어 있다. 설치할 것도, 빌드할 것도 없다.

```typescript
import { Database } from "bun:sqlite";
const db = new Database("app.sqlite", { create: true });
```

### 동기 API의 미덕

`bun:sqlite`는 동기(synchronous) API다. `await` 없이 바로 결과를 받는다.

```typescript
// 비동기 DB 클라이언트 (pg, mysql2 등)
const user = await db.query("SELECT * FROM users WHERE id = ?", [id]);

// bun:sqlite — 동기, 즉시 반환
const user = db.query("SELECT * FROM users WHERE id = ?").get(id);
```

"동기면 블로킹 아닌가?"라는 걱정이 들 수 있다. SQLite는 인프로세스 DB라 네트워크 I/O가 없다. 대부분의 쿼리가 마이크로초 단위로 끝난다. 오히려 async/await 오버헤드가 없어서 더 빠른 경우가 많다.

### Prepared Statements

```typescript
const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
const user = stmt.get("user@example.com");
// stmt를 재사용하면 쿼리 파싱 비용이 첫 1회만 발생
```

Bun의 prepared statement는 내부적으로 SQLite의 `sqlite3_prepare_v3`를 호출한다. 같은 쿼리를 반복 실행할 때 성능 차이가 크다.

### Transaction 지원

```typescript
const insertUsers = db.transaction((users) => {
  const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  for (const user of users) {
    stmt.run(user.name, user.email);
  }
});

insertUsers(usersArray); // 전체가 atomic하게 실행
```

`db.transaction()`은 함수를 받아서 BEGIN/COMMIT/ROLLBACK을 자동 처리한다. 에러가 나면 자동 롤백.

---

## WAL 모드: 필수이자 함정

### WAL이란

SQLite의 기본 쓰기 방식은 Rollback Journal이다. 데이터를 바꾸기 전에 원본을 `.sqlite-journal` 파일에 백업하고, 본 DB를 직접 수정한다.

WAL(Write-Ahead Logging)은 반대다. 본 DB는 건드리지 않고, 변경 내용을 `.sqlite-wal` 파일에 먼저 기록한다.

```
Rollback: 원본 백업 → 본 DB 수정 → journal 삭제
WAL:      본 DB 유지 → WAL에 기록 → 나중에 합침(checkpoint)
```

### 왜 WAL이 필수인가

**동시성.** Rollback 모드에서는 쓰기 중에 읽기가 차단된다. WAL 모드에서는 읽기와 쓰기가 동시에 가능하다. 웹 서버에서 여러 요청이 동시에 DB를 접근하는 환경이라면 WAL은 선택이 아니라 필수다.

```typescript
db.run("PRAGMA journal_mode = WAL");
```

### 함정: WAL 파일이 안 줄어든다

여기서 문제가 시작된다. WAL에 쌓인 변경은 언젠가 본 DB로 합쳐져야 한다. 이걸 **checkpoint**라고 부른다.

SQLite에는 `wal_autocheckpoint`라는 설정이 있어서 기본 1000페이지(약 4MB)마다 자동으로 checkpoint를 시도한다. 하지만 이 자동 checkpoint는 두 가지 한계가 있다:

1. **Passive 모드만 쓴다**: Reader가 WAL을 참조 중이면 건너뛴다. 서버가 바쁜 시간대에는 계속 스킵될 수 있다.
2. **파일 크기를 안 줄인다**: WAL 내부적으로 "여기까지 합쳤다"고 표시만 하고, 파일 자체를 truncate하지 않는다.

결과적으로 시간이 지나면:

```
├── app.sqlite       10MB (본 DB)
├── app.sqlite-wal   85MB (WAL, 계속 커짐)
└── app.sqlite-shm   32KB (shared memory index)
```

WAL 파일이 본 DB보다 커지는 건 드문 일이 아니다.

---

## 트러블슈팅 경험: Docker Volume이 계속 커지는 문제

최근 Workflow Studio라는 프로젝트에서 이 문제를 직접 겪었다. 증상은 이랬다:

- 로컬 Docker 환경에서 volume 크기가 계속 증가
- `docker system df`로 확인하니 volume이 수백 MB 이상
- 앱 데이터 자체는 10~20MB인데 뭐가 이렇게 큰지 의문

원인을 추적해보니 두 개의 SQLite 파일이 있었다:

```
/data/workflow-studio.sqlite          (메인 DB)
/data/workflow-studio-langgraph.sqlite (LangGraph 체크포인트 DB)
```

두 DB 모두 `PRAGMA journal_mode = WAL`은 설정했지만, **checkpoint를 명시적으로 호출하는 곳이 없었다.** 자동 checkpoint에만 의존하고 있었던 것이다.

특히 LangGraph 체크포인트 DB는 AI 대화 세션마다 전체 상태 스냅샷을 BLOB으로 저장하기 때문에 WAL 쓰기량이 많았다. 한 세션에 10턴이면 10개의 체크포인트가 쌓이고, 각각이 수십 KB.

### 해결

```typescript
// 1. wal_autocheckpoint 명시 설정
db.run("PRAGMA wal_autocheckpoint = 1000");

// 2. 주기적으로 TRUNCATE checkpoint
const walInterval = setInterval(() => {
  db.run("PRAGMA wal_checkpoint(TRUNCATE)");
}, 5 * 60 * 1000); // 5분마다
```

핵심은 **TRUNCATE 모드**다. SQLite checkpoint에는 4가지 모드가 있다:

| 모드 | 동작 | 파일 크기 |
|------|------|----------|
| PASSIVE | 가능한 만큼 합침. reader 방해 안 함 | 줄지 않음 |
| FULL | 모든 WAL 합침. 새 writer 잠시 차단 | 줄지 않음 |
| RESTART | FULL + WAL 재사용 시작 | 줄지 않음 |
| TRUNCATE | FULL + WAL 파일을 0으로 자름 | **줄어듦** |

`wal_autocheckpoint`가 기본으로 쓰는 건 PASSIVE다. 디스크를 실제로 회수하려면 TRUNCATE를 명시적으로 호출해야 한다.

### 추가로 발견한 것: 오래된 체크포인트 정리

WAL 문제를 해결한 후에도 LangGraph DB가 여전히 컸다. 7일 넘은 세션의 체크포인트가 영원히 남아있었기 때문이다.

```typescript
// 1시간마다 7일 이상 된 세션의 체크포인트를 삭제
function purgeStaleCheckpoints() {
  const staleRows = mainDb
    .query(`SELECT id FROM builder_sessions
            WHERE updated_at < datetime('now', '-7 days')
            OR status = 'deleted'`)
    .all();
  if (staleRows.length === 0) return;
  const threadIds = staleRows.map((r) => r.id);
  checkpointDb.deleteThreads(threadIds);
}
```

WAL 관리와 데이터 보존 정책은 별개 문제다. 둘 다 챙겨야 디스크가 안정된다.

---

## better-sqlite3와의 API 차이

Node.js에서 `better-sqlite3`를 쓰다가 Bun으로 넘어올 때 알아야 할 차이:

```typescript
// better-sqlite3
db.pragma("journal_mode = WAL");        // pragma() 메서드
const row = stmt.get(id);               // 없으면 undefined

// bun:sqlite
db.run("PRAGMA journal_mode = WAL");    // run() 또는 exec()
const row = stmt.get(id);               // 없으면 null
```

`undefined` vs `null` 차이가 미묘하지만, `row == null` 으로 통일하면 양쪽 다 커버된다. LangGraph의 `SqliteSaver`처럼 better-sqlite3 기반 라이브러리를 Bun에서 쓰려면 이런 차이를 래핑하는 어댑터가 필요하다.

---

## Docker에서 SQLite + WAL 쓸 때 주의점

### Volume mount는 디렉토리 단위로

SQLite WAL 모드는 3개 파일이 한 세트다:

```
app.sqlite       (본 DB)
app.sqlite-wal   (WAL 로그)
app.sqlite-shm   (shared memory)
```

**3개가 같은 디렉토리에 있어야 한다.** 본 DB 파일만 volume에 넣고 나머지를 컨테이너 레이어에 두면 데이터가 유실된다.

```dockerfile
ENV DB_PATH=/data/app.sqlite
# /data 디렉토리를 통째로 volume mount
```

### 컨테이너 강제 종료 시

OOM kill이나 `docker kill`로 컨테이너가 갑자기 죽으면 마지막 checkpoint가 안 된 WAL이 남는다. 다음 시작 시 SQLite가 자동 recovery를 하지만, WAL 파일 크기는 줄지 않는다.

Graceful shutdown을 반드시 구현하자:

```typescript
function shutdown() {
  clearInterval(walInterval);
  db.run("PRAGMA wal_checkpoint(TRUNCATE)");
  db.close();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

### PaaS에서의 비용

Fly.io, Railway 같은 PaaS는 volume 크기에 과금한다. WAL 관리를 안 하면 실제 데이터는 10MB인데 50MB를 지불하는 상황이 생긴다.

---

## 실전 체크리스트

bun:sqlite를 프로덕션에 올리기 전에:

- [ ] `PRAGMA journal_mode = WAL` 설정했는가
- [ ] `PRAGMA wal_autocheckpoint` 값을 적절히 설정했는가
- [ ] 주기적으로 `PRAGMA wal_checkpoint(TRUNCATE)` 호출하는 코드가 있는가
- [ ] SIGTERM/SIGINT 핸들러에서 checkpoint + close 하는가
- [ ] Docker volume이 DB 디렉토리 전체를 마운트하는가
- [ ] 오래된 데이터 보존 정책(retention policy)이 있는가
- [ ] WAL 파일 크기를 모니터링하고 있는가

---

## 마치며

`bun:sqlite`는 빠르고 편하다. 하지만 "설정 한 줄이면 끝"이라고 생각하면 프로덕션에서 디스크가 터진다. WAL은 동시성을 주는 대신 관리 책임을 개발자에게 넘긴다.

핵심은 세 줄이다:

```typescript
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA wal_autocheckpoint = 1000");
setInterval(() => db.run("PRAGMA wal_checkpoint(TRUNCATE)"), 5 * 60 * 1000);
```

이 세 줄이 있느냐 없느냐가 "SQLite 잘 쓰는 팀"과 "디스크 왜 차지?" 팀을 가른다.
