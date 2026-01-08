import { config } from 'dotenv'
import { createServer } from './server'

// 환경 변수 로드 (.env.local 우선, 그다음 .env)
// NOTE: env.ts가 import되기 전에 dotenv가 로드되어야 함
config({ path: '.env.local' })
config()

import { env } from './config/env'

// Graceful shutdown 함수 참조 (startServer에서 설정)
let gracefulShutdown: (() => Promise<void>) | null = null

async function startServer() {
  try {
    const { server, gracefulShutdown: shutdown } = await createServer()
    gracefulShutdown = shutdown

    const port = env.PORT
    const host = env.HOST

    await server.listen({ port, host })

    console.log(`🚀 Persona API 서버가 시작되었습니다!`)
    console.log(`📍 서버 주소: http://${host}:${port}`)
    console.log(`📚 API 문서: http://${host}:${port}/documentation`)
    console.log(`❤️  헬스체크: http://${host}:${port}/health`)
  } catch (error) {
    console.error('서버 시작 실패:', error)
    process.exit(1)
  }
}

// Graceful shutdown handler
async function handleShutdown(signal: string) {
  console.log(`${signal} 신호를 받았습니다. Graceful shutdown 시작...`)

  if (gracefulShutdown) {
    try {
      await gracefulShutdown()
    } catch (error) {
      console.error('Graceful shutdown 중 오류:', error)
    }
  }

  process.exit(0)
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))

// 예상치 못한 오류 처리
process.on('uncaughtException', (error) => {
  console.error('예상치 못한 오류:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, _promise) => {
  console.error('처리되지 않은 Promise 거부:', reason)
  process.exit(1)
})

startServer()
