#!/usr/bin/env tsx

import { ChromaClient } from 'chromadb';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'persona_documents';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const chroma = new ChromaClient({ path: CHROMA_URL });

/**
 * CLI commands
 */
const commands = {
  status: checkStatus,
  list: listDocuments,
  add: addDocument,
  remove: removeDocument,
  query: queryDocuments,
  backup: backupCollection,
  restore: restoreCollection,
  help: showHelp,
};

async function checkStatus() {
  console.log('📊 Checking database status...');
  
  try {
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME });
    const count = await collection.count();
    
    console.log(`✅ Collection "${CHROMA_COLLECTION_NAME}" exists`);
    console.log(`📄 Total documents: ${count}`);
    
    // Get sample documents
    const results = await collection.get({ limit: 5 });
    if (results.metadatas && results.metadatas.length > 0) {
      console.log('\n📋 Sample documents:');
      results.metadatas.forEach((metadata, index) => {
        console.log(`  ${index + 1}. ${metadata?.type} - ${metadata?.filename}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Collection not found or error:', error);
  }
}

async function listDocuments() {
  console.log('📄 Listing all documents...');
  
  try {
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME });
    const results = await collection.get();
    
    if (!results.metadatas || results.metadatas.length === 0) {
      console.log('📭 No documents found');
      return;
    }
    
    const groupedByType: { [key: string]: any[] } = {};
    results.metadatas.forEach((metadata, index) => {
      const type = metadata?.type || 'unknown';
      if (!groupedByType[type]) {
        groupedByType[type] = [];
      }
      groupedByType[type].push({
        id: results.ids?.[index],
        filename: metadata?.filename,
        chunk_index: metadata?.chunk_index,
        total_chunks: metadata?.total_chunks,
      });
    });
    
    Object.entries(groupedByType).forEach(([type, docs]) => {
      console.log(`\n📂 ${type.toUpperCase()}`);
      const fileGroups: { [key: string]: any[] } = {};
      docs.forEach(doc => {
        const filename = doc.filename || 'unknown';
        if (!fileGroups[filename]) {
          fileGroups[filename] = [];
        }
        fileGroups[filename].push(doc);
      });
      
      Object.entries(fileGroups).forEach(([filename, chunks]) => {
        console.log(`  📄 ${filename} (${chunks.length} chunks)`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error listing documents:', error);
  }
}

async function addDocument() {
  const filePath = process.argv[4];
  const type = process.argv[5];
  
  if (!filePath || !type) {
    console.error('❌ Usage: npm run manage add <file-path> <type>');
    console.error('   Example: npm run manage add ./data/new-doc.md thoughts');
    return;
  }
  
  console.log(`📄 Adding document: ${filePath} (type: ${type})`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    // Split into chunks and generate embeddings
    const chunks = splitIntoChunks(content);
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME });
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${type}_${filename}_${i}`;
      const embedding = await generateEmbedding(chunk);
      
      await collection.add({
        ids: [id],
        embeddings: [embedding],
        documents: [chunk],
        metadatas: [{
          type,
          filename,
          chunk_index: i,
          total_chunks: chunks.length,
        }],
      });
    }
    
    console.log(`✅ Added ${chunks.length} chunks from ${filename}`);
    
  } catch (error) {
    console.error('❌ Error adding document:', error);
  }
}

async function removeDocument() {
  const filename = process.argv[4];
  
  if (!filename) {
    console.error('❌ Usage: npm run manage remove <filename>');
    console.error('   Example: npm run manage remove resume.md');
    return;
  }
  
  console.log(`🗑️  Removing document: ${filename}`);
  
  try {
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME });
    const results = await collection.get();
    
    const idsToRemove = results.ids?.filter((id, index) => {
      const metadata = results.metadatas?.[index];
      return metadata?.filename === filename;
    }) || [];
    
    if (idsToRemove.length === 0) {
      console.log('📭 No documents found with that filename');
      return;
    }
    
    await collection.delete({ ids: idsToRemove });
    console.log(`✅ Removed ${idsToRemove.length} chunks from ${filename}`);
    
  } catch (error) {
    console.error('❌ Error removing document:', error);
  }
}

async function queryDocuments() {
  const query = process.argv.slice(4).join(' ');
  
  if (!query) {
    console.error('❌ Usage: npm run manage query <your question>');
    console.error('   Example: npm run manage query "What are your technical skills?"');
    return;
  }
  
  console.log(`🔍 Querying: "${query}"`);
  
  try {
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME });
    const queryEmbedding = await generateEmbedding(query);
    
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 5,
    });
    
    if (results.documents && results.documents[0]) {
      console.log('\n📄 Search results:');
      results.documents[0].forEach((doc, index) => {
        const metadata = results.metadatas?.[0]?.[index];
        console.log(`\n${index + 1}. [${metadata?.type}/${metadata?.filename}]`);
        console.log(doc?.substring(0, 200) + '...');
        console.log(`   Distance: ${results.distances?.[0]?.[index]?.toFixed(4)}`);
      });
    } else {
      console.log('📭 No results found');
    }
    
  } catch (error) {
    console.error('❌ Error querying documents:', error);
  }
}

async function backupCollection() {
  const backupPath = process.argv[4] || `./backup_${Date.now()}.json`;
  
  console.log(`💾 Backing up collection to: ${backupPath}`);
  
  try {
    const collection = await chroma.getCollection({ name: CHROMA_COLLECTION_NAME });
    const results = await collection.get();
    
    const backup = {
      collection_name: CHROMA_COLLECTION_NAME,
      timestamp: new Date().toISOString(),
      data: results,
    };
    
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved to ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Error creating backup:', error);
  }
}

async function restoreCollection() {
  const backupPath = process.argv[4];
  
  if (!backupPath) {
    console.error('❌ Usage: npm run manage restore <backup-file>');
    return;
  }
  
  console.log(`🔄 Restoring collection from: ${backupPath}`);
  
  try {
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
    
    // Delete existing collection
    try {
      await chroma.deleteCollection({ name: CHROMA_COLLECTION_NAME });
    } catch (error) {
      console.log('ℹ️  No existing collection to delete');
    }
    
    // Create new collection
    const collection = await chroma.createCollection({
      name: CHROMA_COLLECTION_NAME,
      metadata: { description: "Personal documents for RAG chatbot" }
    });
    
    // Restore data
    const data = backupData.data;
    if (data.ids && data.ids.length > 0) {
      await collection.add({
        ids: data.ids,
        embeddings: data.embeddings,
        documents: data.documents,
        metadatas: data.metadatas,
      });
    }
    
    console.log(`✅ Restored ${data.ids?.length || 0} documents`);
    
  } catch (error) {
    console.error('❌ Error restoring collection:', error);
  }
}

function showHelp() {
  console.log(`
📚 Persona API Data Management Tool

Usage: npm run manage <command> [options]

Commands:
  status                    Show database status and document count
  list                      List all documents grouped by type
  add <file> <type>         Add a new document to the collection
  remove <filename>         Remove a document from the collection
  query <question>          Query the collection with a question
  backup [file]             Backup the collection to a JSON file
  restore <file>            Restore the collection from a backup file
  help                      Show this help message

Examples:
  npm run manage status
  npm run manage list
  npm run manage add ./data/new-doc.md thoughts
  npm run manage remove resume.md
  npm run manage query "What are your technical skills?"
  npm run manage backup ./my-backup.json
  npm run manage restore ./my-backup.json
`);
}

// Utility functions
function splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

// Main execution
async function main() {
  const command = process.argv[3];
  
  if (!command || !commands[command as keyof typeof commands]) {
    showHelp();
    return;
  }
  
  await commands[command as keyof typeof commands]();
}

if (require.main === module) {
  main().catch(console.error);
}