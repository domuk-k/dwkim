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

## 8. Changesets로 버전/릴리즈 노트 관리

```bash
pnpm add -D @changesets/cli
pnpm exec changeset init
```

변경사항이 있을 때마다:

```bash
pnpm exec changeset # 변경을 기록하는 마크다운 파일 생성
```

- 변경 타입/설명 입력 → 마크다운 파일 생성

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

## 10. NPM 배포

1. 변경사항 발생 시 `pnpm exec changeset`으로 변경점 기록
2. PR 머지 → GitHub Actions가 자동으로 NPM에 배포

---

## 참고

- [예제 저장소 ↗]
- [Changesets 공식 문서 ↗]
- [tsup 공식문서 ↗]
- [pnpm 공식문서 ↗]
