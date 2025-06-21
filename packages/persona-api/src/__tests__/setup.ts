// Jest 테스트 설정
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config({ path: '.env.test' });

// 테스트 타임아웃 설정
jest.setTimeout(10000);

// 전역 테스트 설정
beforeAll(async () => {
  // 테스트 시작 전 공통 설정
});

afterAll(async () => {
  // 테스트 종료 후 정리 작업
});
