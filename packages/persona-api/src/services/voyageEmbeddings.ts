import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings'
import { VoyageAIClient } from 'voyageai'
import { env } from '../config/env'

export interface VoyageEmbeddingsParams extends EmbeddingsParams {
  /**
   * Voyage AI model name
   * @default "voyage-multilingual-2"
   */
  modelName?: string

  /**
   * Voyage AI API key (defaults to VOYAGE_API_KEY env var)
   */
  apiKey?: string

  /**
   * Batch size for processing multiple texts
   * @default 128
   */
  batchSize?: number
}

/**
 * Voyage AI Embeddings
 *
 * voyage-multilingual-2: Optimized for multilingual retrieval
 * - 1024 dimensions
 * - 32K context length
 * - 100+ languages including Korean
 * - Outperforms OpenAI and Cohere on Korean by 5.6%
 */
export class VoyageEmbeddings extends Embeddings {
  private client: VoyageAIClient
  private modelName: string
  private batchSize: number

  constructor(params: VoyageEmbeddingsParams = {}) {
    super(params)
    const apiKey = params.apiKey || env.VOYAGE_API_KEY
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY is required')
    }
    this.client = new VoyageAIClient({ apiKey })
    this.modelName = params.modelName || 'voyage-multilingual-2'
    // 10K TPM 제한 대비 작은 배치 (약 10-15개 문서 = ~5K 토큰)
    this.batchSize = params.batchSize || 10
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = []

    // Batch processing with rate limit handling
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize)

      // Retry with exponential backoff for rate limits
      let retries = 0
      const maxRetries = 5

      while (retries < maxRetries) {
        try {
          const response = await this.client.embed({
            input: batch,
            model: this.modelName,
            inputType: 'document'
          })

          // Extract embeddings from response
          if (response.data) {
            for (const item of response.data) {
              if (item.embedding) {
                embeddings.push(item.embedding)
              }
            }
          }
          break // Success, exit retry loop
        } catch (error: unknown) {
          const voyageError = error as { statusCode?: number }
          if (voyageError.statusCode === 429 && retries < maxRetries - 1) {
            retries++
            const delay = 2 ** retries * 20000 // 20s, 40s, 80s...
            console.log(
              `Rate limited, waiting ${delay / 1000}s before retry ${retries}/${maxRetries}...`
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
          } else {
            throw error
          }
        }
      }

      // Progress logging
      const progress = Math.min(i + this.batchSize, texts.length)
      console.log(`Embedded ${progress}/${texts.length} documents`)

      // Rate limit delay between batches (3 RPM = 20s between requests)
      if (i + this.batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 21000))
      }
    }

    return embeddings
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await this.client.embed({
      input: [text],
      model: this.modelName,
      inputType: 'query'
    })

    if (!response.data?.[0]?.embedding) {
      throw new Error('Failed to get embedding from Voyage AI')
    }

    return response.data[0].embedding
  }
}
