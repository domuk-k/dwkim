# NPM 패키지 배포 가이드

이 문서는 [Blazing Fast Tips: Publishing to NPM](https://youtu.be/eh89VE3Mk5g?si=oXgStRKeVp8GBl7c) 영상의 최신 TypeScript 라이브러리 개발 및 NPM 배포 워크플로우를 실습 중심으로 정리한 것입니다.

## TL;DR

빠른 NPM 패키지 배포를 위한 주요 커맨드 요약:

- 프로젝트 초기화:  
  `npm init -y`
- Git 초기화:  
  `git init`
- TypeScript 설정:  
  `pnpm add -D typescript`  
  `pnpm exec tsc --init`

- 빌드 도구(tsup) 설치:  
  `pnpm add -D tsup`
- 빌드:  
  `pnpm run build`
- 타입 검사:  
  `pnpm run lint`
- Changesets 설치/초기화:  
  `pnpm add -D @changesets/cli`  
  `pnpm exec changeset init`
- 변경점 기록:  
  `pnpm exec changeset`
- NPM 배포(수동):  
  `pnpm publish`

---

## 1. 프로젝트 초기화

```bash
npm init # 또는 npm init -y (기본값 자동입력)
```

- `package.json`에서 `"name"`, `"license"` 등 기본 정보 지정
- 예시
  ```json
  {
    "name": "dwkim",
    "version": "0.0.1",
    "description": "this",
    "license": "MIT",
    "author": "dannyworks102@gmail.com",
    "type": "commonjs",
    "main": "src/index.ts"
  }
  ```

---

## 2. Git 초기화 및 .gitignore 작성

```bash
git init
```

- `.gitignore` 파일 생성:

```
node_modules
dist
```

---

## 3. TypeScript 설치 및 설정

```bash
pnpm add -D typescript
pnpm exec tsc --init
```

- `tsconfig.json`에 아래 옵션 추가/수정:

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "noEmit": true
  }
}
```

---

## 4. 소스 코드 작성

예시: `src/index.ts`

```typescript
export function add(a: number, b: number): number {
  return a + b;
}
```

---

## 5. 빌드 도구(tsup) 설치 및 빌드 스크립트 추가

```bash
pnpm add -D tsup
```

- `package.json`에 빌드 스크립트 추가:

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm",
    "lint": "tsc"
  }
}
```

```bash
pnpm run build
```

- 결과: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts` 등 생성

---

## 6. package.json 진입점 지정

```json
{
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts"
}
```

---

## 7. 타입 검사

```bash
pnpm run lint
```

---

## 8. Changesets로 버전/릴리즈 노트 관리 (실무 워크플로우)

```bash
pnpm add -D @changesets/cli
pnpm exec changeset init
```

- `.changeset/` 폴더는 반드시 **git에 커밋**해야 합니다. (gitignore에 추가하면 안 됨)
- 변경사항이 있을 때마다 아래 명령어로 변경점(md 파일)을 기록합니다 (e.g. PR 할때마다)

```bash
pnpm exec changeset # 변경점 기록(md 파일 생성)
```

- 릴리즈(버전 업데이트) 준비 시 (c.f. main 브랜치에서)

```bash
pnpm exec changeset version # package.json, CHANGELOG.md 자동 업데이트
```

- 배포(수동) (c.f. main 브랜치에서)

```bash
pnpm exec changeset publish
```

> **실무 워크플로우 요약**
>
> - PR마다 `pnpm exec changeset`으로 변경점만 기록
> - main 브랜치에서 `changeset version` & `changeset publish`를 실행하거나,
> - GitHub Actions에서 자동화(merge → version/publish)하는 것이 일반적입니다.

---

## 9. GitHub Actions로 CI/CD 자동화

### `.github/workflows/main.yml` (테스트/빌드)

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run build
```

### `.github/workflows/publish.yml` (배포)

```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    concurrency: release
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: changesets/action@v1
        with:
          publish: pnpm publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- NPM_TOKEN은 GitHub 레포지토리의 Secrets에 등록 필요

---

## 10. NPM 배포 (자동화/수동 워크플로우)

- **자동화:**

  1. PR마다 `pnpm exec changeset`으로 변경점 기록
  2. main 브랜치 머지 → GitHub Actions가 자동으로 `changeset version` & `changeset publish` 실행
  3. NPM에 자동 배포

- **수동:**
  1. 변경점 기록 후,
  2. `pnpm exec changeset version`
  3. `pnpm exec changeset publish`

---

## 11. NPM 배포 시 꼭 알아야 할 실무 팁

### 1. dist만 NPM에 포함시키기

- `package.json`에 아래처럼 **files 필드**를 추가하면, NPM 배포 시 dist 폴더만 포함됩니다.

```json
"files": [
  "dist"
]
```

- 또는, `.npmignore` 파일을 만들어 불필요한 파일/폴더를 명시적으로 제외할 수 있습니다.
  (단, files 필드가 있으면 files가 우선 적용됨)

예시:

```
src/
test/
.github/
.vscode/
*.ts
*.md
!dist/
```

### 2. bin 필드와 shebang

- CLI로 실행하려면 `package.json`에 아래처럼 **bin 필드**를 추가해야 합니다.

```json
"bin": {
  "dwkim": "dist/index.js"
}
```

- 그리고 `src/index.ts`의 맨 위에 아래와 같이 **shebang**을 추가해야 합니다.

```typescript
#!/usr/bin/env node
```

- 빌드 후(`dist/index.js`)에도 이 줄이 남아 있어야 하며, 실행 권한도 확인하세요.

### 3. 빌드 후 배포

- 반드시 `pnpm run build`로 dist 폴더가 생성된 후에 배포해야 합니다.
- release 스크립트에 build가 포함되어 있는지 확인하세요.

### 4. .gitignore vs .npmignore

- `.gitignore`: git에 포함하지 않을 파일
- `.npmignore`: npm publish 시 포함하지 않을 파일 (없으면 .gitignore를 참고)
- **files 필드가 있으면 files가 최우선 적용**

---

## 참고

- [예제 저장소 ↗]
- [Changesets 공식 문서 ↗]
- [tsup 공식문서 ↗]
- [pnpm 공식문서 ↗]
