import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';
import OpenAI from 'openai';

export interface OpenAIEmbeddingsParams extends EmbeddingsParams {
  /**
   * OpenAI model name
   * @default "text-embedding-3-large"
   */
  modelName?: string;

  /**
   * Embedding dimensions (text-embedding-3-large supports 256-3072)
   * @default 3072
   */
  dimensions?: number;

  /**
   * OpenAI API key (defaults to OPENAI_API_KEY env var)
   */
  apiKey?: string;

  /**
   * Batch size for processing multiple texts
   * @default 100
   */
  batchSize?: number;
}

/**
 * OpenAI Embeddings (text-embedding-3-large)
 *
 * - 3072 dimensions (configurable: 256, 1024, 1536, 3072)
 * - 8191 token context
 * - Strong world knowledge (company names, etc.)
 * - Better semantic understanding for complex queries
 *
 * 가격: $0.00013/1K tokens (3-large)
 */
export class OpenAIEmbeddings extends Embeddings {
  private client: OpenAI;
  private modelName: string;
  private dimensions: number;
  private batchSize: number;

  constructor(params: OpenAIEmbeddingsParams = {}) {
    super(params);
    const apiKey = params.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.client = new OpenAI({ apiKey });
    this.modelName = params.modelName || 'text-embedding-3-large';
    this.dimensions = params.dimensions || 3072;
    this.batchSize = params.batchSize || 100;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      const response = await this.client.embeddings.create({
        model: this.modelName,
        input: batch,
        dimensions: this.dimensions,
      });

      for (const item of response.data) {
        embeddings.push(item.embedding);
      }

      // Progress logging
      const progress = Math.min(i + this.batchSize, texts.length);
      console.log(`Embedded ${progress}/${texts.length} documents`);
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: text,
      dimensions: this.dimensions,
    });

    if (!response.data?.[0]?.embedding) {
      throw new Error('Failed to get embedding from OpenAI');
    }

    return response.data[0].embedding;
  }

  /**
   * 현재 설정된 차원 수 반환
   */
  getDimensions(): number {
    return this.dimensions;
  }
}
