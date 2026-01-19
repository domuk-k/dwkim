import { config } from 'dotenv'

// 환경 변수 로드 (.env.local 우선, 그다음 .env)
// NOTE: env.ts가 import되기 전에 dotenv가 로드되어야 함
config({ path: '.env.local' })
config()

import { env } from './config/env'
import { createServer } from './server'

async function startServer() {
  try {
    const { server } = await createServer()

    const port = env.PORT
    const host = env.HOST

    server.listen({ port, hostname: host })

    console.log(`🚀 Persona API 서버가 시작되었습니다!`)
    console.log(`📍 서버 주소: http://${host}:${port}`)
    console.log(`📚 API 문서: http://${host}:${port}/docs`)
    console.log(`❤️  헬스체크: http://${host}:${port}/health`)
  } catch (error) {
    console.error('서버 시작 실패:', error)
    process.exit(1)
  }
}

// Graceful shutdown handler
async function handleShutdown(signal: string) {
  console.log(`${signal} 신호를 받았습니다. 서버 종료 중...`)
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
