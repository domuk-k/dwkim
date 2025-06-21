import Fastify from 'fastify';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// Fastify 인스턴스 생성
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// 서버 시작
async function start() {
  try {
    await fastify.listen({
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0',
    });

    console.log('🚀 Persona API 서버가 시작되었습니다!');
    console.log(`📍 서버 주소: http://localhost:${process.env.PORT || '3000'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// 서버 시작
start();
