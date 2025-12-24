#!/usr/bin/env tsx

import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document as LangChainDocument } from '@langchain/core/documents';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local first (for local dev), then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

// Configuration
const DATA_DIR = path.join(__dirname, '../data');
const BLOG_ABOUT_DIR = path.join(__dirname, '../../blog/src/content/about');
const BLOG_POSTS_DIR = path.join(__dirname, '../../blog/src/content/posts');
const COLLECTION_NAME = 'persona_documents';

interface ChunkResult {
  id: string;
  content: string;
  metadata: {
    type: string;
    title: string;
    category?: string;
    source: 'persona-api' | 'blog';
    pubDate?: string;
    keywords?: string[];
    chunkIndex: number;
    totalChunks: number;
  };
}

/**
 * 단락 기반 청킹 (persona-api/data용)
 */
function chunkByParagraph(text: string, maxSize: number = 1000): string[] {
  const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = paragraph;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * 섹션 기반 청킹 (blog posts용 - H2 기준)
 * H2 이전의 서문은 첫 번째 H2 섹션에 병합
 */
function chunkBySection(text: string): string[] {
  const sections = text.split(/(?=^## )/m);
  const filtered = sections.filter((s) => s.trim().length > 0);

  // H1 제목만 있는 첫 섹션을 다음 섹션에 병합
  if (filtered.length > 1 && !filtered[0].includes('## ')) {
    const header = filtered[0];
    filtered[1] = header + '\n\n' + filtered[1];
    return filtered.slice(1);
  }

  return filtered;
}

/**
 * YAML Frontmatter 파싱
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, unknown> = {};
  match[1].split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // 배열 파싱 (keywords 등)
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        // 파싱 실패시 그대로 문자열
      }
    } else if (
      typeof value === 'string' &&
      (value.startsWith("'") || value.startsWith('"'))
    ) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  });

  return { frontmatter, body: match[2] };
}

/**
 * 텍스트에서 첫 번째 제목 추출
 */
function extractTitle(text: string): string | null {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

/**
 * 키워드로 카테고리 추론
 */
function inferCategory(keywords?: string[]): string {
  if (!keywords || keywords.length === 0) return 'general';

  const aiKeywords = ['AI', 'Claude', 'agent', 'LLM', 'RAG'];
  const devKeywords = ['프로젝트', '멘탈모델', '프로세스', 'TDD'];

  if (keywords.some((k) => aiKeywords.some((ai) => k.includes(ai)))) return 'ai';
  if (keywords.some((k) => devKeywords.some((dev) => k.includes(dev))))
    return 'methodology';
  return 'philosophy';
}

/**
 * persona-api/data/*.md 처리
 */
async function processDataFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing persona-api/data files...');

  let files: string[];
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    console.warn('⚠️  data 디렉토리를 찾을 수 없습니다:', DATA_DIR);
    return [];
  }

  const results: ChunkResult[] = [];
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'systemPrompt.md');

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
    const type = path.basename(file, '.md');

    // resume.md는 섹션 기반 청킹 (## 기준)
    if (type === 'resume') {
      const chunks = chunkBySection(content);
      console.log(`  📄 ${file}: ${chunks.length} chunks (by section)`);

      chunks.forEach((chunk, index) => {
        // 섹션 제목 추출 (## 로 시작하는 첫 줄)
        const sectionTitle = chunk.match(/^##\s+(.+)/m)?.[1] || '김동욱 이력서';

        // 경력 섹션에 자연어 설명 추가 (임베딩 모델의 한국어 의미 연결 보완)
        let enhancedContent = chunk.trim();
        if (sectionTitle.includes('경력')) {
          enhancedContent = `dwkim이 일한 회사와 직장 경력, 근무 이력입니다. 어떤 회사에서 일했는지, 무슨 일을 했는지 확인할 수 있습니다.\n\n${enhancedContent}`;
        }

        results.push({
          id: `data_${type}_${index}`,
          content: enhancedContent,
          metadata: {
            type,
            title: sectionTitle,
            source: 'persona-api',
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        });
      });
      continue;
    }

    const chunks = chunkByParagraph(content);
    console.log(`  📄 ${file}: ${chunks.length} chunks`);

    chunks.forEach((chunk, index) => {
      results.push({
        id: `data_${type}_${index}`,
        content: chunk,
        metadata: {
          type,
          title: extractTitle(chunk) || type,
          source: 'persona-api',
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      });
    });
  }

  return results;
}

/**
 * blog/src/content/about/*.md 처리
 */
async function processAboutFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing blog/about files...');

  let files: string[];
  try {
    files = await fs.readdir(BLOG_ABOUT_DIR);
  } catch {
    console.warn('⚠️  about 디렉토리를 찾을 수 없습니다:', BLOG_ABOUT_DIR);
    return [];
  }

  const results: ChunkResult[] = [];
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(BLOG_ABOUT_DIR, file), 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // rag: false인 경우 스킵
    if (frontmatter.rag === false || frontmatter.rag === 'false') {
      console.log(`  ⏭️  ${file}: skipped (rag: false)`);
      continue;
    }

    const category = path.basename(file, '.md');

    console.log(`  📄 ${file}: 1 chunk (whole document)`);

    // About 파일은 짧으므로 전체 문서를 하나의 청크로
    results.push({
      id: `about_${category}_0`,
      content: body.trim(),
      metadata: {
        type: 'about',
        title: (frontmatter.title as string) || category,
        category,
        source: 'blog',
        chunkIndex: 0,
        totalChunks: 1,
      },
    });
  }

  return results;
}

/**
 * blog/src/content/posts/*.md 처리
 */
async function processPostFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing blog/posts files...');

  let files: string[];
  try {
    files = await fs.readdir(BLOG_POSTS_DIR);
  } catch {
    console.warn('⚠️  posts 디렉토리를 찾을 수 없습니다:', BLOG_POSTS_DIR);
    return [];
  }

  const results: ChunkResult[] = [];
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(BLOG_POSTS_DIR, file), 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // rag: false인 경우 스킵
    if (frontmatter.rag === false || frontmatter.rag === 'false') {
      console.log(`  ⏭️  ${file}: skipped (rag: false)`);
      continue;
    }

    const slug = path.basename(file, '.md');
    const keywords = frontmatter.keywords as string[] | undefined;

    // 섹션 기반 청킹
    const chunks = chunkBySection(body);

    console.log(`  📄 ${file}: ${chunks.length} chunks`);

    chunks.forEach((chunk, index) => {
      results.push({
        id: `post_${slug}_${index}`,
        content: chunk.trim(),
        metadata: {
          type: 'post',
          title: (frontmatter.title as string) || slug,
          category: inferCategory(keywords),
          source: 'blog',
          pubDate: frontmatter.pubDate as string,
          keywords,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      });
    });
  }

  return results;
}

/**
 * Qdrant 초기화
 */
async function initializeDatabase(testMode: boolean = false) {
  console.log('\n🚀 Qdrant 초기화 시작...\n');

  const qdrantUrl = process.env.QDRANT_URL;
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  // 테스트 모드가 아닐 때만 환경변수 체크
  if (!testMode) {
    if (!qdrantUrl) {
      console.error('❌ QDRANT_URL 환경변수가 필요합니다');
      process.exit(1);
    }

    if (!apiKey) {
      console.error('❌ GOOGLE_API_KEY 또는 GEMINI_API_KEY 환경변수가 필요합니다');
      process.exit(1);
    }
  }

  // 모든 문서 수집
  const dataChunks = await processDataFiles();
  const aboutChunks = await processAboutFiles();
  const postChunks = await processPostFiles();

  const allChunks = [...dataChunks, ...aboutChunks, ...postChunks];

  console.log(`\n📊 총 청크 수: ${allChunks.length}`);
  console.log(`   - data: ${dataChunks.length}`);
  console.log(`   - about: ${aboutChunks.length}`);
  console.log(`   - posts: ${postChunks.length}\n`);

  if (testMode) {
    console.log('🧪 테스트 모드 - DB 업로드 건너뜀\n');
    console.log('샘플 청크:');
    allChunks.slice(0, 3).forEach((chunk, i) => {
      console.log(`\n--- Chunk ${i + 1} ---`);
      console.log(`ID: ${chunk.id}`);
      console.log(`Type: ${chunk.metadata.type}`);
      console.log(`Title: ${chunk.metadata.title}`);
      console.log(`Content: ${chunk.content.substring(0, 100)}...`);
    });
    return;
  }

  // Embeddings 초기화
  console.log('🔧 임베딩 모델 초기화...');
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'text-embedding-004',
  });

  // Qdrant 클라이언트 설정
  const url = new URL(qdrantUrl!);
  const isHttps = url.protocol === 'https:';

  // HTTPS 외부 접근시 포트 443 사용, 내부/로컬은 URL에서 추출
  const port = isHttps ? 443 : parseInt(url.port || '6333');

  console.log(`🔗 Qdrant 연결: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`);

  // QdrantClient 직접 생성 (포트 명시)
  const qdrantClient = new QdrantClient({
    host: url.hostname,
    port,
    https: isHttps,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false, // 버전 체크 스킵
  });

  // LangChain Document로 변환
  const docs = allChunks.map(
    (chunk) =>
      new LangChainDocument({
        pageContent: chunk.content,
        metadata: {
          ...chunk.metadata,
          docId: chunk.id,
        },
      })
  );

  // Vector Store 생성 (기존 컬렉션 덮어쓰기)
  console.log('🔧 Qdrant 컬렉션 생성 중...');
  const vectorStore = await QdrantVectorStore.fromDocuments(
    docs,
    embeddings,
    {
      client: qdrantClient,
      collectionName: COLLECTION_NAME,
    }
  );

  console.log(`✅ ${allChunks.length}개 문서 업로드 완료!`);

  // 연결 확인을 위해 간단한 검색 테스트
  const testResults = await vectorStore.similaritySearch('테스트', 1);
  if (testResults.length > 0) {
    console.log('✅ Qdrant 연결 확인 완료');
  }

  console.log('\n✅ 데이터베이스 초기화 완료!');
}

/**
 * 검색 테스트 (MMR 포함)
 */
async function testRetrieval() {
  console.log('\n🔍 검색 테스트 시작...\n');

  const qdrantUrl = process.env.QDRANT_URL;
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!qdrantUrl || !apiKey) {
    console.error('❌ QDRANT_URL과 API 키가 필요합니다');
    return;
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'text-embedding-004',
  });

  // Qdrant 클라이언트 설정
  const url = new URL(qdrantUrl);
  const isHttps = url.protocol === 'https:';
  const port = isHttps ? 443 : parseInt(url.port || '6333');

  console.log(`🔗 Qdrant 연결: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`);

  const qdrantClient = new QdrantClient({
    host: url.hostname,
    port,
    https: isHttps,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      client: qdrantClient,
      collectionName: COLLECTION_NAME,
    }
  );

  const testQueries = [
    '기술 스택이 뭔가요?',
    '어떤 프로젝트를 했나요?',
    'AI에 대한 생각은?',
    '개발 철학이 있나요?',
  ];

  console.log('📌 일반 검색 (Similarity Search):');
  for (const query of testQueries) {
    console.log(`\n❓ Query: "${query}"`);

    const results = await vectorStore.similaritySearch(query, 3);

    if (results.length === 0) {
      console.log('   ❌ 결과 없음');
    } else {
      results.forEach((doc, index) => {
        console.log(
          `   ${index + 1}. [${doc.metadata.type}] ${doc.pageContent.substring(0, 80)}...`
        );
      });
    }
  }

  console.log('\n\n📌 MMR 검색 (다양성 최적화):');
  for (const query of testQueries) {
    console.log(`\n❓ Query: "${query}"`);

    const results = await vectorStore.maxMarginalRelevanceSearch(query, {
      k: 3,
      fetchK: 10,
      lambda: 0.5,
    });

    if (results.length === 0) {
      console.log('   ❌ 결과 없음');
    } else {
      results.forEach((doc, index) => {
        console.log(
          `   ${index + 1}. [${doc.metadata.type}] ${doc.pageContent.substring(0, 80)}...`
        );
      });
    }
  }
}

/**
 * 컬렉션 삭제 후 재생성
 */
async function cleanAndInitialize() {
  console.log('\n🧹 컬렉션 정리 시작...\n');

  const qdrantUrl = process.env.QDRANT_URL;
  if (!qdrantUrl) {
    console.error('❌ QDRANT_URL 환경변수가 필요합니다');
    process.exit(1);
  }

  const url = new URL(qdrantUrl);
  const isHttps = url.protocol === 'https:';
  const port = isHttps ? 443 : parseInt(url.port || '6333');

  console.log(`🔗 Qdrant 연결: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`);

  const qdrantClient = new QdrantClient({
    host: url.hostname,
    port,
    https: isHttps,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false,
  });

  // 컬렉션 삭제
  try {
    await qdrantClient.deleteCollection(COLLECTION_NAME);
    console.log(`✅ 기존 컬렉션 '${COLLECTION_NAME}' 삭제 완료`);
  } catch (error) {
    console.log(`ℹ️  컬렉션이 존재하지 않거나 이미 삭제됨`);
  }

  // 재초기화
  await initializeDatabase(false);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const runRetrieval = args.includes('--retrieval');
  const cleanMode = args.includes('--clean');

  if (runRetrieval) {
    await testRetrieval();
  } else if (cleanMode) {
    await cleanAndInitialize();
    await testRetrieval();
  } else {
    await initializeDatabase(testMode);

    if (!testMode) {
      await testRetrieval();
    }
  }

  console.log('\n🎉 완료!\n');
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
