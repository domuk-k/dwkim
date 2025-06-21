import { z } from 'zod';

// Chat 요청 스키마
export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, '메시지는 필수입니다')
    .max(1000, '메시지는 1000자 이하여야 합니다')
    .refine(
      (msg) => !msg.includes('<script>'),
      '스크립트 태그는 허용되지 않습니다'
    )
    .refine(
      (msg) => !msg.includes('javascript:'),
      'JavaScript 프로토콜은 허용되지 않습니다'
    ),
});

// Chat 응답 스키마
export const chatResponseSchema = z.object({
  response: z.string(),
  responseTime: z.number().describe('응답 시간 (밀리초)'),
  timestamp: z.string().describe('응답 생성 시간'),
});

// 에러 응답 스키마
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      })
    )
    .optional(),
});

// 타입 추출
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
