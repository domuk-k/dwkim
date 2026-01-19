import { Elysia } from 'elysia'
import { env } from '../config/env'
import { PersonaEngine } from '../services/personaAgent'

export const healthRoutes = new Elysia({ prefix: '/health' })
  // GET /health
  .get('/', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }))
  // GET /health/detailed
  .get('/detailed', async () => {
    try {
      // 메모리 사용량
      const memUsage = process.memoryUsage()
      const memoryInfo = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      }

      // RAG 엔진 상태
      let ragEngineStatus: Record<string, unknown> = {
        status: 'not_initialized',
        components: {}
      }
      try {
        const personaEngine = new PersonaEngine()
        const engineStatus = await personaEngine.getEngineStatus()
        ragEngineStatus = {
          status: 'ready',
          components: engineStatus
        }
      } catch (error) {
        console.error('RAG Engine health check failed:', error)
        ragEngineStatus = {
          status: 'error',
          components: {
            vectorStore: false,
            llmService: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV,
        components: {
          server: true,
          ragEngine: ragEngineStatus
        },
        memory: memoryInfo
      }
    } catch (error) {
      console.error('Detailed health check failed:', error)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
