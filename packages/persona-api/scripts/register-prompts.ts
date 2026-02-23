/**
 * Langfuse Prompt 등록 스크립트 (1회 실행)
 *
 * Usage: bun run scripts/register-prompts.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { LangfuseClient } from '@langfuse/client'

const client = new LangfuseClient({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

// data/systemPrompt.md 내용을 그대로 사용
const systemPromptPath = resolve(import.meta.dir, '../data/systemPrompt.md')
const systemPromptContent = readFileSync(systemPromptPath, 'utf-8')

const prompts = [
  {
    name: 'persona-system',
    prompt: systemPromptContent,
    labels: ['production'],
    config: { description: '메인 시스템 프롬프트 - 1인칭 김동욱 페르소나' }
  },
  {
    name: 'seu-quick-response',
    prompt: `당신은 김동욱에 대한 질문에 **한 문장**으로 핵심만 답변하는 AI입니다.
- 모르면 "잘 모르겠어요"라고 솔직히 답변
- 여러 가능성이 있으면 가장 가능성 높은 것 하나만
- 최대 100자 이내`,
    labels: ['production'],
    config: { description: 'SEU 불확실성 측정용 단답 프롬프트' }
  },
  {
    name: 'followup-questions',
    prompt: `You are a helpful assistant that develops conversations about Kim Dongwook.

Based on the user's question and related documents, suggest 2 follow-up questions the user might naturally ask after seeing the answer.

## Related Documents
{{context}}

## User Question
{{query}}

## Rules
- Don't repeat already answered content
- Develop new keywords/topics mentioned in the answer
- Avoid generic phrases like "tell me more"
- Each question should be concise (one sentence)
- Questions should be answerable from documents
- {{langInstruction}}
- Respond ONLY with a JSON array (e.g., ["question1", "question2"])

Follow-up questions:`,
    labels: ['production'],
    config: { description: '팔로업 질문 생성 - context, query, langInstruction 변수' }
  },
  {
    name: 'suggestion-rewrite',
    prompt: `## 질문 재작성

사용자가 "{{query}}"라고 물었습니다. 모호해서 **사용자가 김동욱에게 물어볼 구체적인 질문 2개**로 바꿔주세요.
{{interpretationsSection}}
## 김동욱 정보
{{context}}

## 핵심 규칙
질문의 화자는 **사용자**입니다. 사용자가 김동욱에게 묻는 질문을 생성하세요.

## ❌ 잘못된 예시 (AI가 되묻는 형태 - 절대 금지)
- "모토에 대해 궁금해?" ← AI가 사용자에게 되묻는 것
- "어떤 거 알고 싶어?" ← AI가 사용자에게 되묻는 것
- "뭐가 궁금한 거야?" ← AI가 사용자에게 되묻는 것

## ✅ 올바른 예시 (사용자가 김동욱에게 묻는 형태)
- "잘뛰나" → ["러닝 얼마나 해?", "마라톤 기록 있어?"]
- "기술?" → ["주로 어떤 언어 써?", "좋아하는 프레임워크 뭐야?"]

## 형식
- 반말 의문문, 15자 이내
- {{langInstruction}}
- JSON 배열로만: ["질문1", "질문2"]

질문:`,
    labels: ['production'],
    config: {
      description:
        '모호한 쿼리 재작성 - query, context, interpretationsSection, langInstruction 변수'
    }
  }
]

async function main() {
  console.log('Registering prompts to Langfuse...\n')

  for (const p of prompts) {
    try {
      await client.prompt.create(p)
      console.log(`  ✓ ${p.name}`)
    } catch (error: any) {
      // 이미 존재하는 경우 새 버전 생성 시도
      if (error?.message?.includes('already exists') || error?.statusCode === 409) {
        console.log(`  ~ ${p.name} (already exists, skipping)`)
      } else {
        console.error(`  ✗ ${p.name}:`, error?.message || error)
      }
    }
  }

  console.log('\nDone!')
}

main()
