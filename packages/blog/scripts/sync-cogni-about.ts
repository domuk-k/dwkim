/**
 * Cogni 노트 중 tags: [about]가 있는 것을 about/로 복사
 *
 * 사용법:
 *   pnpm sync-cogni-about
 *   (prebuild에서 sync-cogni-posts와 함께 실행)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

const COGNI_PERSONA_DIR = join(homedir(), '.cogni', 'notes', 'persona');
const ABOUT_DIR = join(process.cwd(), 'src', 'content', 'about');

interface Frontmatter {
  title?: string;
  tags?: string[];
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
      value = value.replace(/^["']|["']$/g, '');
      (frontmatter as Record<string, unknown>)[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Cogni frontmatter를 blog about 형식으로 변환
 * (about은 title만 필요)
 */
function convertToAboutFrontmatter(frontmatter: Frontmatter): string {
  const lines = ['---'];
  lines.push(`title: ${frontmatter.title || 'Untitled'}`);
  lines.push('---\n');
  return lines.join('\n');
}

/**
 * 디렉토리를 스캔하여 모든 .md 파일 찾기
 */
function findMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isFile() && entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 메인 함수
 */
function main() {
  console.log('🔄 Syncing Cogni persona notes with about tag...\n');

  if (!existsSync(ABOUT_DIR)) {
    mkdirSync(ABOUT_DIR, { recursive: true });
  }

  const mdFiles = findMarkdownFiles(COGNI_PERSONA_DIR);
  let syncedCount = 0;

  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // tags에 about이 있는지 확인
    if (!frontmatter.tags?.includes('about')) {
      continue;
    }

    const fileName = basename(filePath);
    const destPath = join(ABOUT_DIR, fileName);

    // about 형식으로 변환
    const aboutFrontmatter = convertToAboutFrontmatter(frontmatter);
    const newContent = aboutFrontmatter + body;

    writeFileSync(destPath, newContent);
    console.log(`  ✅ ${fileName}`);
    syncedCount++;
  }

  if (syncedCount === 0) {
    console.log('  ℹ️  No notes with [about] tag found.');
  } else {
    console.log(`\n✨ Synced ${syncedCount} about sections from Cogni notes.`);
  }
}

main();
