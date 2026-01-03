/**
 * BM25 Engine for Hybrid Search
 *
 * Sparse embedding 생성을 위한 BM25 엔진
 * - 한국어/영어 혼용 토크나이저
 * - Qdrant sparse vector 형식 출력
 *
 * @see https://www.npmjs.com/package/fast-bm25
 * @see https://qdrant.tech/articles/sparse-vectors/
 */

// 한국어 불용어 (조사, 어미, 접속사)
const KOREAN_STOPWORDS = new Set([
  // 조사
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '로', '으로',
  '와', '과', '도', '만', '부터', '까지', '에게', '한테', '께',
  // 어미
  '다', '요', '죠', '네', '군', '구나',
  // 접속사/부사
  '그리고', '그래서', '그러나', '하지만', '또한', '그런데', '즉', '왜냐하면',
  // 대명사 (검색에서는 제외)
  '나', '너', '우리', '저', '이것', '그것', '저것',
  // 일반
  '있다', '없다', '하다', '되다', '이다', '것', '수', '등', '때', '중',
]);

// 영어 불용어
const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
  'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just',
]);

/**
 * Qdrant sparse vector 형식
 */
export interface SparseVector {
  indices: number[];
  values: number[];
}

/**
 * 토큰화된 문서
 */
interface TokenizedDocument {
  id: string;
  tokens: string[];
}

/**
 * BM25 Engine
 *
 * 문서 corpus로 BM25 인덱스를 구축하고,
 * 쿼리에 대한 sparse vector를 생성
 */
export class BM25Engine {
  private documents: TokenizedDocument[] = [];
  private vocabulary: Map<string, number> = new Map(); // token → index
  private documentFrequency: Map<string, number> = new Map(); // token → df
  private avgDocLength: number = 0;
  private initialized: boolean = false;

  // BM25 파라미터 (Okapi BM25 표준)
  private k1: number = 1.5; // term frequency saturation
  private b: number = 0.75; // length normalization

  /**
   * 한국어 + 영어 혼용 토크나이저
   *
   * 한글 형태소 분석 없이 정규식 기반으로 근사:
   * 1. 한글 조사/어미 분리 (간단한 규칙)
   * 2. 영어/숫자는 공백 분리
   * 3. 불용어 제거
   */
  tokenize(text: string): string[] {
    // 1. 소문자 변환 (영어)
    let normalized = text.toLowerCase();

    // 2. 한글 조사 분리 (간단한 패턴)
    // "김동욱이" → "김동욱", "이"
    // "프로젝트를" → "프로젝트", "를"
    normalized = normalized
      .replace(/([가-힣]+)(이|가|은|는|을|를|의|에|에서|로|으로|와|과|도)(?=\s|$|[^가-힣])/g, '$1 $2 ')
      .replace(/([가-힣]+)(했|했던|하는|한|할|합니다|해요|하고|하면)(?=\s|$|[^가-힣])/g, '$1 $2 ');

    // 3. 특수문자 제거, 공백으로 분리
    const tokens = normalized
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 0);

    // 4. 불용어 제거 + 최소 길이 필터
    return tokens.filter((token) => {
      if (token.length < 2) return false;
      if (KOREAN_STOPWORDS.has(token)) return false;
      if (ENGLISH_STOPWORDS.has(token)) return false;
      return true;
    });
  }

  /**
   * 문서 corpus로 BM25 인덱스 초기화
   */
  async initialize(documents: Array<{ id: string; content: string }>): Promise<void> {
    if (documents.length === 0) {
      console.warn('BM25Engine: No documents to index');
      this.initialized = true;
      return;
    }

    // 1. 토큰화
    this.documents = documents.map((doc) => ({
      id: doc.id,
      tokens: this.tokenize(doc.content),
    }));

    // 2. 평균 문서 길이
    const totalTokens = this.documents.reduce((sum, doc) => sum + doc.tokens.length, 0);
    this.avgDocLength = totalTokens / this.documents.length;

    // 3. 어휘 구축 + Document Frequency 계산
    this.vocabulary.clear();
    this.documentFrequency.clear();
    let vocabIndex = 0;

    for (const doc of this.documents) {
      const uniqueTokens = new Set(doc.tokens);
      for (const token of uniqueTokens) {
        // 어휘에 추가
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, vocabIndex++);
        }
        // DF 증가
        this.documentFrequency.set(token, (this.documentFrequency.get(token) || 0) + 1);
      }
    }

    this.initialized = true;
    console.log(
      `BM25Engine: Indexed ${this.documents.length} documents, ` +
      `${this.vocabulary.size} unique tokens, ` +
      `avg doc length: ${this.avgDocLength.toFixed(1)}`
    );
  }

  /**
   * 쿼리에 대한 BM25 sparse vector 생성
   *
   * Qdrant sparse vector 형식: { indices: [], values: [] }
   * - indices: 어휘 인덱스 (vocabulary index)
   * - values: BM25 term weight
   */
  generateSparseVector(query: string): SparseVector {
    if (!this.initialized) {
      console.warn('BM25Engine: Not initialized, returning empty vector');
      return { indices: [], values: [] };
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return { indices: [], values: [] };
    }

    const indices: number[] = [];
    const values: number[] = [];

    // 쿼리 토큰별 term frequency
    const queryTF = new Map<string, number>();
    for (const token of queryTokens) {
      queryTF.set(token, (queryTF.get(token) || 0) + 1);
    }

    const N = this.documents.length;

    for (const [token, tf] of queryTF) {
      const vocabIndex = this.vocabulary.get(token);
      if (vocabIndex === undefined) {
        // 어휘에 없는 토큰은 스킵 (OOV)
        continue;
      }

      const df = this.documentFrequency.get(token) || 0;
      if (df === 0) continue;

      // IDF (Inverse Document Frequency)
      // log((N - df + 0.5) / (df + 0.5) + 1)
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      // BM25 term weight (쿼리 측면)
      // 쿼리는 짧으므로 length normalization 없이 단순 TF*IDF
      const weight = idf * tf;

      if (weight > 0) {
        indices.push(vocabIndex);
        values.push(Math.round(weight * 1000) / 1000); // 소수점 3자리
      }
    }

    return { indices, values };
  }

  /**
   * 어휘 크기 반환
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * 초기화 여부
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Pattern
// ─────────────────────────────────────────────────────────────

let bm25Engine: BM25Engine | null = null;
let initPromise: Promise<void> | null = null;

export function getBM25Engine(): BM25Engine {
  if (!bm25Engine) {
    bm25Engine = new BM25Engine();
  }
  return bm25Engine;
}

/**
 * BM25 엔진 초기화 (Qdrant에서 corpus 로드)
 * RAG 엔진 초기화 시 호출됨
 */
export async function initBM25Engine(documents: Array<{ id: string; content: string }>): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  const engine = getBM25Engine();
  if (engine.isInitialized()) {
    console.log('BM25 engine already initialized');
    return;
  }

  initPromise = engine.initialize(documents).finally(() => {
    initPromise = null;
  });

  return initPromise;
}

export function resetBM25Engine(): void {
  bm25Engine = null;
  initPromise = null;
}
