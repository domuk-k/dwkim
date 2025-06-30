import { config } from 'dotenv';
import { createServer } from './server';

// 환경 변수 로드
config();

async function startServer() {
  try {
    const server = await createServer();

    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    console.log(`🚀 Persona API 서버가 시작되었습니다!`);
    console.log(`📍 서버 주소: http://${host}:${port}`);
    console.log(`📚 API 문서: http://${host}:${port}/documentation`);
    console.log(`❤️  헬스체크: http://${host}:${port}/health`);
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT 신호를 받았습니다. 서버를 종료합니다...');
  process.exit(0);
});

// 예상치 못한 오류 처리
process.on('uncaughtException', (error) => {
  console.error('예상치 못한 오류:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

startServer();
