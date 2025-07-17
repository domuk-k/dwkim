# dwkim-workspace

이 저장소는 **dwkim** CLI 도구를 포함한 pnpm workspace 모노레포입니다.

## 📦 Packages

### [dwkim](./packages/dwkim) - CLI 명함 도구

개발자의 프로필 정보를 기반으로 터미널에서 명함을 출력하는 CLI 도구입니다.

```bash
npx dwkim
```

### [blog](./packages/blog) - Astro 블로그

MDX 기반의 개인 블로그 사이트입니다.

- **Framework**: Astro 5.11+ with static site generation
- **Content**: Astro Content Collections for MDX processing
- **Styling**: Custom CSS with mathematical typography support (KaTeX)
- **Features**: RSS/Atom feeds, sitemap, image optimization, table of contents
