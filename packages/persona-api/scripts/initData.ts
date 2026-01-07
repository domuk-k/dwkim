#!/usr/bin/env tsx

import fs from 'node:fs/promises'
import path from 'node:path'
import { ChromaClient } from 'chromadb'
import dotenv from 'dotenv'
import OpenAI from 'openai'

// Load environment variables
dotenv.config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000'
const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'persona_documents'

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required')
  process.exit(1)
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const chroma = new ChromaClient({ path: CHROMA_URL })

interface DocumentChunk {
  id: string
  content: string
  metadata: {
    type: string
    filename: string
    chunk_index: number
    total_chunks: number
  }
}

/**
 * Split document into smaller chunks for better retrieval
 */
function splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
  const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      currentChunk = paragraph
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Generate embeddings using OpenAI (with fallback to mock)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })

    return response.data[0].embedding
  } catch (_error) {
    console.log('OpenAI API failed, using mock embedding for:', `${text.substring(0, 50)}...`)
    // Return mock embedding with 1536 dimensions
    return Array.from({ length: 1536 }, () => Math.random() - 0.5)
  }
}

/**
 * Process a single document file
 */
async function processDocument(filePath: string, type: string): Promise<DocumentChunk[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const filename = path.basename(filePath)
  const chunks = splitIntoChunks(content)

  return chunks.map((chunk, index) => ({
    id: `${type}_${filename}_${index}`,
    content: chunk,
    metadata: {
      type,
      filename,
      chunk_index: index,
      total_chunks: chunks.length
    }
  }))
}

/**
 * Initialize the vector database with documents
 */
async function initializeDatabase() {
  console.log('🚀 Initializing persona documents database...')

  try {
    // Delete existing collection if it exists
    try {
      await chroma.deleteCollection({ name: CHROMA_COLLECTION_NAME })
      console.log('✅ Deleted existing collection')
    } catch (_error) {
      console.log('ℹ️  No existing collection to delete')
    }

    // Create new collection
    const collection = await chroma.createCollection({
      name: CHROMA_COLLECTION_NAME,
      metadata: { description: 'Personal documents for RAG chatbot' }
    })
    console.log('✅ Created collection:', CHROMA_COLLECTION_NAME)

    // Process all documents
    const dataDir = path.join(__dirname, '../data')
    const files = await fs.readdir(dataDir)
    const markdownFiles = files.filter((file) => file.endsWith('.md'))

    const allDocuments: DocumentChunk[] = []

    for (const file of markdownFiles) {
      const filePath = path.join(dataDir, file)
      const type = path.basename(file, '.md') // resume.md -> resume

      console.log(`📄 Processing ${file}...`)
      const documents = await processDocument(filePath, type)
      allDocuments.push(...documents)
    }

    console.log(`📚 Total chunks to process: ${allDocuments.length}`)

    // Generate embeddings and add to collection
    const batchSize = 10
    for (let i = 0; i < allDocuments.length; i += batchSize) {
      const batch = allDocuments.slice(i, i + batchSize)

      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allDocuments.length / batchSize)}...`
      )

      const embeddings = await Promise.all(batch.map((doc) => generateEmbedding(doc.content)))

      await collection.add({
        ids: batch.map((doc) => doc.id),
        embeddings: embeddings,
        documents: batch.map((doc) => doc.content),
        metadatas: batch.map((doc) => doc.metadata)
      })
    }

    console.log('✅ Successfully initialized database with all documents!')

    // Verify the collection
    const count = await collection.count()
    console.log(`📊 Collection contains ${count} documents`)
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

/**
 * Test the retrieval system
 */
async function testRetrieval() {
  console.log('\n🔍 Testing retrieval system...')

  try {
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME })

    // Test queries
    const testQueries = [
      '기술 스택이 뭔가요?',
      '어떤 프로젝트를 하고 있나요?',
      '개발 철학이 있나요?',
      '실패 경험이 있나요?'
    ]

    for (const query of testQueries) {
      console.log(`\n❓ Query: "${query}"`)

      const queryEmbedding = await generateEmbedding(query)
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 3
      })

      if (results.documents?.[0]) {
        results.documents[0].forEach((doc, index) => {
          console.log(`📄 Result ${index + 1}:`, `${doc?.substring(0, 100)}...`)
        })
      }
    }
  } catch (error) {
    console.error('❌ Error testing retrieval:', error)
  }
}

// Main execution
async function main() {
  await initializeDatabase()
  await testRetrieval()
  console.log('\n🎉 Data initialization complete!')
}

if (require.main === module) {
  main().catch(console.error)
}
