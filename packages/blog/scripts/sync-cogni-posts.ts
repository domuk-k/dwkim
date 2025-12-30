/**
 * Cogni 노트 중 tags: [blog]가 있는 것을 posts/로 복사
 *
 * 사용법:
 *   pnpm sync-cogni
 *   pnpm build (prebuild에서 자동 실행)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

const COGNI_NOTES_DIR = join(homedir(), '.cogni', 'notes');
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

interface Frontmatter {
  title?: string;
  tags?: string[];
  pubDate?: string;
  created?: string;
  description?: string;
  draft?: boolean;
  slug?: string;
}

/**
 * YAML frontmatter 파싱 (간단한 버전)
 */
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlStr = match[1];
  const body = match[2];
  const frontmatter: Frontmatter = {};

  // 간단한 YAML 파싱
  for (const line of yamlStr.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // 배열 처리 (tags: [a, b, c])
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayStr = value.slice(1, -1);
      frontmatter[key as keyof Frontmatter] = arrayStr
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, '')) as string[];
    } else {
      // 따옴표 제거
      value = value.replace(/^["']|["']$/g, '');
      (frontmatter as Record<string, unknown>)[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Obsidian callout 문법을 HTML로 변환
 *
 * > [!term] 💡 Title
 * > Content line 1
 * > Content line 2
 *
 * →
 *
 * <div class="callout callout-term">
 * <div class="callout-title">💡 Title</div>
 * <div class="callout-content">
 * <p>Content line 1</p>
 * <p>Content line 2</p>
 * </div>
 * </div>
 */
function transformObsidianCallouts(content: string): string {
  // Obsidian callout 패턴: > [!type] title 으로 시작하는 blockquote
  const calloutRegex = /^(> \[!(\w+)\]\s*(.*))\n((?:>.*\n?)*)/gm;

  return content.replace(calloutRegex, (_match, _firstLine, type, title, restLines) => {
    const calloutType = type.toLowerCase();
    const calloutTitle = title || `💡 ${type.toUpperCase()}`;

    // > 로 시작하는 라인들에서 > 제거하고 내용 추출
    const contentLines = restLines
      .split('\n')
      .filter((line: string) => line.startsWith('>'))
      .map((line: string) => line.slice(1).trim()) // > 와 앞뒤 공백 제거
      .filter((line: string) => line.length > 0);

    // 각 라인을 <p>로 감싸기
    const contentHtml = contentLines.map((line: string) => `<p>${line}</p>`).join('\n');

    return `<div class="callout callout-${calloutType}">
<div class="callout-title">${calloutTitle}</div>
<div class="callout-content">
${contentHtml}
</div>
</div>

`;
  });
}

/**
 * Cogni frontmatter를 Astro 형식으로 변환
 */
function convertToAstroFrontmatter(frontmatter: Frontmatter): string {
  const astro: Record<string, unknown> = {
    title: frontmatter.title || 'Untitled',
    description: frontmatter.description || '',
    pubDate: frontmatter.pubDate || frontmatter.created || new Date().toISOString().split('T')[0],
  };

  // draft 상태 확인 (tags에 draft가 있거나 draft: true)
  if (frontmatter.draft || frontmatter.tags?.includes('draft')) {
    astro.draft = true;
  }

  // slug가 있으면 추가 (선택적)
  if (frontmatter.slug) {
    astro.slug = frontmatter.slug;
  }

  // 이미지가 있으면 추가
  // (향후 확장)

  const lines = ['---'];
  for (const [key, value] of Object.entries(astro)) {
    if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---\n');

  return lines.join('\n');
}

/**
 * 디렉토리를 재귀적으로 스캔하여 모든 .md 파일 찾기
 */
function findMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // .obsidian 등 숨김 폴더 제외
      if (!entry.startsWith('.')) {
        files.push(...findMarkdownFiles(fullPath));
      }
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 메인 함수
 */
function main() {
  console.log('🔄 Syncing Cogni notes with blog tag...\n');

  // posts 디렉토리 확인
  if (!existsSync(POSTS_DIR)) {
    mkdirSync(POSTS_DIR, { recursive: true });
  }

  // Cogni 노트 스캔
  const mdFiles = findMarkdownFiles(COGNI_NOTES_DIR);
  let syncedCount = 0;

  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // tags에 blog가 있는지 확인
    if (!frontmatter.tags?.includes('blog')) {
      continue;
    }

    // draft 태그가 있으면 스킵 (또는 draft: true로 복사)
    const isDraft = frontmatter.tags?.includes('draft') || frontmatter.draft;

    // 파일명 생성
    const fileName = basename(filePath);
    const destPath = join(POSTS_DIR, fileName);

    // Astro 형식으로 변환
    const astroFrontmatter = convertToAstroFrontmatter(frontmatter);

    // Obsidian callout을 HTML로 변환
    const transformedBody = transformObsidianCallouts(body);

    const newContent = astroFrontmatter + transformedBody;

    writeFileSync(destPath, newContent);
    console.log(`  ✅ ${fileName}${isDraft ? ' (draft)' : ''}`);
    syncedCount++;
  }

  if (syncedCount === 0) {
    console.log('  ℹ️  No notes with [blog] tag found.');
  } else {
    console.log(`\n✨ Synced ${syncedCount} posts from Cogni notes.`);
  }
}

main();
