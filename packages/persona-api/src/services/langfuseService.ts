/**
 * Langfuse Service
 *
 * LangGraph 파이프라인의 LLM observability를 위한 Langfuse 통합.
 * OTEL TracerProvider + LangfuseSpanProcessor로 트레이스 데이터를 Langfuse에 전송.
 * CallbackHandler를 통해 각 노드의 실행, LLM 호출, 토큰 사용량을 자동 추적.
 * LangfuseClient를 통해 Prompt Management 지원.
 *
 * @see https://langfuse.com/docs/integrations/langchain
 */

import { LangfuseClient } from '@langfuse/client'
import { CallbackHandler } from '@langfuse/langchain'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { setLangfuseTracerProvider } from '@langfuse/tracing'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { env } from '../config/env'

let _enabled = false
let _client: LangfuseClient | null = null

/** 프롬프트 캐시 (서버 시작 시 pre-fetch) */
const _promptCache = new Map<string, string>()

export function initLangfuse(): void {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    console.log('Langfuse: Disabled (no keys configured)')
    return
  }

  // OTEL TracerProvider 초기화 (트레이싱용)
  const provider = new NodeTracerProvider({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        baseUrl: env.LANGFUSE_BASE_URL
      })
    ]
  })
  setLangfuseTracerProvider(provider)

  // LangfuseClient 초기화 (Prompt Management용)
  _client = new LangfuseClient({
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL
  })

  _enabled = true
  console.log('Langfuse: Enabled (OTEL + CallbackHandler + Prompt Management)')
}

export function isLangfuseEnabled(): boolean {
  return _enabled
}

/**
 * 서버 시작 시 모든 프롬프트를 pre-fetch하여 캐싱.
 * Langfuse 장애 시에도 캐싱된 프롬프트로 서비스 유지.
 */
export async function prefetchPrompts(names: string[]): Promise<void> {
  if (!_client) return

  const results = await Promise.allSettled(
    names.map(async (name) => {
      const prompt = await _client!.prompt.get(name)
      const compiled = prompt.compile()
      _promptCache.set(name, compiled)
      return name
    })
  )

  const loaded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected')
  console.log(`Langfuse Prompts: loaded ${loaded}/${names.length} prompts`)
  for (const f of failed) {
    console.warn('Langfuse Prompt fetch failed:', (f as PromiseRejectedResult).reason)
  }
}

/**
 * Langfuse에서 프롬프트를 가져와 컴파일.
 *
 * 우선순위: Langfuse API → 캐시 → fallback
 * @param name 프롬프트 이름
 * @param variables 템플릿 변수 ({{key}} 형식)
 * @param fallback Langfuse 실패 시 기본값
 */
export async function getPrompt(
  name: string,
  variables?: Record<string, string>,
  fallback?: string
): Promise<string> {
  if (!_client) return fallback ?? ''

  try {
    const prompt = await _client.prompt.get(name)
    const compiled = variables ? prompt.compile(variables) : prompt.compile()
    // 성공 시 캐시 업데이트 (변수 없는 정적 프롬프트만)
    if (!variables) _promptCache.set(name, compiled)
    return compiled
  } catch (error) {
    console.warn(`Langfuse Prompt "${name}" fetch failed, using cache/fallback`)
    // 캐시에 있으면 사용 (변수 있을 때는 캐시 불가)
    if (!variables) {
      const cached = _promptCache.get(name)
      if (cached) return cached
    }
    return fallback ?? ''
  }
}

/**
 * 쿼리별 CallbackHandler 생성
 *
 * LangGraph의 config.callbacks에 전달하면
 * 각 노드, LLM 호출, 토큰 사용량이 자동으로 Langfuse에 기록됨.
 */
export function createLangfuseHandler(options?: {
  sessionId?: string
  userId?: string
  tags?: string[]
  traceMetadata?: Record<string, unknown>
}): CallbackHandler | undefined {
  if (!_enabled) return undefined

  return new CallbackHandler({
    sessionId: options?.sessionId,
    userId: options?.userId,
    tags: options?.tags,
    traceMetadata: options?.traceMetadata
  })
}

/**
 * LangfuseClient 인스턴스 반환 (프롬프트 등록 스크립트용)
 */
export function getLangfuseClient(): LangfuseClient | null {
  return _client
}
