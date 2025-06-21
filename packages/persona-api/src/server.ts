import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import healthRoutes from './routes/health';
import chatRoutes from './routes/chat';

// 환경변수 로드
dotenv.config();

// Fastify 인스턴스 생성 함수
export function createServer() {
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

  return fastify;
}

// Swagger 설정
const swaggerOptions = {
  swagger: {
    info: {
      title: 'Persona API',
      description: 'Personal chatbot API with RAG for dwkim persona',
      version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Chat', description: 'Chat endpoints' },
    ],
  },
};

const swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full' as const,
    deepLinking: false,
  },
  staticCSP: true,
};

// 플러그인 등록
async function registerPlugins(fastify: any) {
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(helmet);

  await fastify.register(swagger, swaggerOptions);
  await fastify.register(swaggerUi, swaggerUiOptions);
}

// 라우트 등록
async function registerRoutes(fastify: any) {
  await fastify.register(healthRoutes);
  await fastify.register(chatRoutes);
}

// 서버 빌드 함수 (테스트용)
export async function build() {
  const fastify = createServer();

  await registerPlugins(fastify);
  await registerRoutes(fastify);

  return fastify;
}

// 서버 시작
async function start() {
  try {
    const fastify = await build();

    await fastify.listen({
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0',
    });

    console.log('🚀 Persona API 서버가 시작되었습니다!');
    console.log(`📍 서버 주소: http://localhost:${process.env.PORT || '3000'}`);
    console.log(
      `📚 API 문서: http://localhost:${process.env.PORT || '3000'}/docs`
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// 서버 시작
start();
