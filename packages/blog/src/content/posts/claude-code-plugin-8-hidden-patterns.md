---
title: "Claude Code 플러그인 8가지 숨겨진 패턴"
description: ""
pubDate: "2026-01-14"
---

# Claude Code 플러그인 8가지 숨겨진 패턴

> 공식 플러그인 소스코드에서 발견한 고급 설계 패턴들. 단순 사용법이 아닌, 왜 이렇게 만들었는지를 분석한다.

앞선 글에서 Command, Agent, Skill, Hook의 역할을 정리했다. 하지만 공식 플러그인들은 단순히 이 컴포넌트들을 사용하는 것 이상의 **설계 철학**을 담고 있다. 이번 글에서는 그 철학을 8가지 패턴으로 정리한다.

## TL;DR

| # | 패턴 | 핵심 효과 | 대표 플러그인 |
|---|------|----------|--------------|
| 1 | Parallel Agent Execution | 다양한 관점, 빠른 실행 | feature-dev, code-review |
| 2 | Hook-Based Behavior Injection | 자동 스타일/검증 주입 | explanatory-output-style |
| 3 | Context-Triggered Skills | 키워드 기반 자동 활성화 | frontend-design |
| 4 | Confidence Scoring | 노이즈 필터링 (80%+) | code-review |
| 5 | MCP Integration | 외부 서비스 연동 | Figma MCP |
| 6 | Progressive Disclosure | 정보 계층화 | plugin-dev |
| 7 | YAML Frontmatter Config | 선언적 설정 | 모든 플러그인 |
| 8 | Workflow Orchestration | 다단계 워크플로우 | feature-dev |

---

## Pattern 1: Parallel Agent Execution

첫 번째 패턴은 가장 눈에 띄는 것이다. 공식 플러그인 곳곳에서 반복된다.

### 문제
단일 에이전트는 한 가지 관점만 제공한다. 코드 리뷰에서 보안, 성능, 유지보수성을 모두 깊이 분석하려면? 한 에이전트에게 다 시키면 어느 하나 깊이가 없어진다.

### 해결책
**여러 에이전트를 동시에 실행**하고 결과를 종합한다.

### 구현: feature-dev

```markdown
## Phase 2: Codebase Exploration

Launch 2-3 code-explorer agents in PARALLEL:

- **Agent 1: Feature Tracer**
  Focus: Similar features, reusable patterns
  Goal: Identify 5-10 relevant files

- **Agent 2: Architecture Mapper**
  Focus: Data flow, service boundaries
  Goal: Map critical integration points

- **Agent 3: UI Pattern Analyzer**
  Focus: Component structures, design system usage
  Goal: Document UI conventions

Wait for ALL agents to complete before proceeding.
```

### 구현: code-review

```markdown
## Step 4: Parallel Review

Launch 4 review agents SIMULTANEOUSLY:

1. **Compliance Agent 1**: CLAUDE.md rule adherence
2. **Compliance Agent 2**: Coding conventions
3. **Bug Detector**: Logic errors, edge cases
4. **History Analyzer**: PR context, related changes
```

### 코드 패턴

```typescript
// Claude가 Task tool을 병렬 호출하는 방식
const results = await Promise.all([
  Task({ agent: "code-explorer", prompt: "Trace feature X" }),
  Task({ agent: "code-explorer", prompt: "Map architecture" }),
  Task({ agent: "code-explorer", prompt: "Analyze UI patterns" }),
]);
```

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. 병렬 실행 = 선형 시간 → 상수 시간
2. 각 에이전트에 명확한 "Focus"와 "Goal" 부여
3. "Wait for ALL" 동기화 지점으로 결과 종합
─────────────────────────────────────────────────
```

---

## Pattern 2: Hook-Based Behavior Injection

병렬 에이전트가 "무엇을 분석하는가"를 다룬다면, 이 패턴은 "어떻게 행동하는가"를 다룬다. 작업 자체가 아니라 **작업의 맥락**을 제어한다.

### 문제
모든 응답에 특정 스타일을 적용하고 싶다. 매번 프롬프트에 쓰기엔 번거롭다. 위험한 명령을 자동으로 차단하고 싶다. 모든 명령을 일일이 검사할 수는 없다.

### 해결책
**SessionStart Hook**으로 세션 시작 시 컨텍스트를 자동 주입한다.

### 구현: explanatory-output-style

```yaml
# hooks/explanatory-style.md
---
name: explanatory-output-style
event: SessionStart
type: prompt
---

You are in 'learning' output style mode.

## Behavior Modification
- Provide educational insights with each response
- Use the ★ Insight format for key learnings
- Balance educational content with task completion

## Insight Format
★ Insight ─────────────────────────────────────
[2-3 key educational points]
─────────────────────────────────────────────────
```

### 구현: security-guidance

```yaml
# hooks/security-check.md
---
name: security-guidance
event: PreToolUse
match_tools: [Bash]
type: prompt
---

Evaluate if this command could be dangerous.

## BLOCK if:
- rm -rf without explicit path confirmation
- sudo without clear context
- Commands affecting system-wide config
- Network operations to unknown hosts

## ALLOW if:
- Standard development commands
- Read-only operations
- User-confirmed destructive operations
```

### 이벤트별 사용 사례

| 이벤트 | 사용 사례 | 예시 |
|--------|----------|------|
| `SessionStart` | 스타일 주입, 컨텍스트 설정 | explanatory-output-style |
| `PreToolUse` | 보안 검증, 차단 | security-guidance |
| `PostToolUse` | 로깅, 후처리 | audit-logging |
| `Stop` | 자동 요약, 체크리스트 | completion-summary |

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. SessionStart = 세션 전체에 영향
2. PreToolUse = 실행 전 검증/차단 게이트
3. prompt 타입 Hook은 Claude가 판단 후 행동
─────────────────────────────────────────────────
```

---

## Pattern 3: Context-Triggered Skills

Hook이 이벤트 기반이라면, Skill은 **의미 기반**이다. 특정 이벤트가 아니라 특정 키워드나 맥락에 반응한다.

### 문제
사용자가 `/command`를 몰라도 적절한 기능이 자동으로 활성화되었으면 좋겠다. 자연어로 대화하듯 요청해도 전문 지식이 적용되면 좋겠다.

### 해결책
**triggers 배열**로 자연어 키워드 매칭을 설정한다.

### 구현: frontend-design

```yaml
# skills/frontend-design.md
---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces
triggers:
  - "/ui"
  - "/frontend"
  - "build UI"
  - "create component"
  - "implement design"
  - "Figma"
---

## When This Skill Activates
- User mentions UI/frontend development
- User provides Figma links or design references
- User asks to build web components, pages, or applications

## Core Principles
1. Avoid generic AI aesthetics
2. Use creative, polished design
3. Leverage design system when available
```

### 구현: plugin-dev의 5가지 개발 스킬

```yaml
# 각 스킬이 특정 키워드에 반응
agent-development:
  triggers: ["create agent", "add agent", "agent frontmatter"]

command-development:
  triggers: ["create command", "slash command", "command yaml"]

skill-development:
  triggers: ["create skill", "add skill", "skill triggers"]

hook-development:
  triggers: ["create hook", "PreToolUse", "SessionStart"]

mcp-integration:
  triggers: ["add MCP", "MCP server", "Model Context Protocol"]
```

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. 슬래시 명령 + 자연어 = 최대 활성화 범위
2. 구체적 키워드일수록 오탐 감소
3. 여러 관련 트리거 조합으로 포괄적 커버
─────────────────────────────────────────────────
```

---

## Pattern 4: Confidence Scoring

앞의 세 패턴은 "무엇을 할지"를 다뤘다. 이 패턴은 "무엇을 **말하지 않을지**"를 다룬다. AI의 가장 흔한 문제 - 너무 많이 말하는 것 - 을 해결한다.

### 문제
AI 코드 리뷰가 너무 많은 "혹시 모르니까" 피드백을 준다. 노이즈가 많아 진짜 문제가 묻힌다.

### 해결책
**신뢰도 임계값**을 설정하고, 높은 확신의 이슈만 리포트한다.

### 구현: code-review

```markdown
## Issue Reporting Guidelines

### Only report issues with 80%+ confidence

**High-signal issues (REPORT):**
- Compilation errors
- Logic errors (null dereference, off-by-one)
- Security vulnerabilities (injection, XSS)
- Clear CLAUDE.md violations

**Low-signal issues (SKIP):**
- Style preferences
- "Maybe" concerns
- Potential performance issues without evidence
- Subjective improvements

### Confidence Assessment
Before reporting, ask:
1. Am I 80%+ confident this is a real issue?
2. Would a senior engineer flag this in code review?
3. Does this have concrete, demonstrable impact?

If any answer is "no", do NOT report.
```

### 재검증 단계

```markdown
## Step 6: Issue Verification

For EACH flagged issue, launch a verification subagent:

**Verification prompt:**
- Is this truly a bug, or expected behavior?
- Does surrounding context justify this code?
- Would fixing this introduce other issues?

**If verification fails:** Remove from report
**If verification passes:** Include with explanation
```

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. 80% threshold = 노이즈 대폭 감소
2. 재검증 = false positive 필터링
3. "Senior engineer test" = 실용적 판단 기준
─────────────────────────────────────────────────
```

---

## Pattern 5: MCP Integration

지금까지 본 패턴들은 Claude와 코드 사이의 상호작용이었다. 하지만 현실에서는 **외부 서비스**와도 연동해야 한다. Figma에서 디자인을 가져오고, DB를 조회하고, API를 호출해야 한다.

### 문제
외부 서비스(Figma, DB, API)와 연동해야 하는데, 플러그인만으로는 한계가 있다. 도구를 직접 만들 수는 없다.

### 해결책
**.mcp.json**으로 MCP 서버를 선언하고, 플러그인에서 활용한다.

### 구현: Figma MCP

```json
// .mcp.json
{
  "mcpServers": {
    "figma": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropics/figma-mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

### 플러그인에서 MCP 활용

```yaml
# skills/frontend-design.md
---
name: frontend-design
triggers: ["Figma", "implement design"]
---

## Required MCP Servers
This skill requires the Figma MCP server to be configured.

## Workflow
1. User provides Figma URL
2. Call `mcp__figma__get_design_context` to fetch design data
3. Generate code matching design specifications
4. Use design tokens from Figma variables
```

### MCP 서버 타입

| 타입 | 통신 방식 | 사용 사례 |
|------|----------|----------|
| `stdio` | 프로세스 입출력 | 로컬 도구 (Figma, DB) |
| `sse` | Server-Sent Events | 실시간 스트리밍 |
| `http` | REST API | 원격 서비스 |

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. MCP = 플러그인의 외부 연동 확장
2. .mcp.json은 프로젝트 루트에 위치
3. 환경 변수로 민감 정보 관리
─────────────────────────────────────────────────
```

---

## Pattern 6: Progressive Disclosure

MCP로 외부 연동까지 다뤘다. 이제 **정보 전달 방식** 자체를 최적화하는 패턴을 보자. 좋은 플러그인은 필요한 정보를 필요한 때에 제공한다.

### 문제
플러그인 문서가 너무 길면 컨텍스트를 낭비한다. LLM의 토큰 한계 안에서 필요한 정보만 제공하고 싶다.

### 해결책
**계층적 정보 구조**로 필요할 때만 상세 내용을 노출한다.

### 구현: plugin-dev

```markdown
# skills/command-development.md

## Quick Reference (항상 표시)

Commands are user-invoked prompts with `/command` syntax.

**Essential structure:**
- `commands/` directory
- YAML frontmatter with `name`, `description`
- Markdown body with instructions

## Deep Dive (요청 시 표시)

### YAML Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Command identifier |
| description | Yes | One-line summary |
| allowed_tools | No | Restrict available tools |
| model | No | Override model (opus/sonnet/haiku) |

### Advanced: Dynamic Arguments
...

### Advanced: Bash Execution
...
```

### 구현 패턴

```markdown
## Overview (Always visible)
[핵심 개념 1-2문장]

## Quick Start (Visible by default)
[최소 시작 코드]

## Configuration (On request: "tell me more about config")
[설정 옵션 상세]

## Advanced Patterns (On request: "advanced usage")
[고급 패턴]

## Troubleshooting (On error or explicit request)
[문제 해결]
```

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. 기본 = 최소 필수 정보만
2. "On request" = 사용자 질문 시 확장
3. 컨텍스트 효율성 = 토큰 절약
─────────────────────────────────────────────────
```

---

## Pattern 7: YAML Frontmatter Configuration

지금까지 본 패턴들은 모두 **런타임 동작**에 관한 것이었다. 이 패턴은 **설정 방식** 자체를 다룬다. 플러그인을 어떻게 선언하고 구성하는가.

### 문제
플러그인 설정을 어디에, 어떤 형식으로 저장해야 하나? JSON? YAML? 별도 설정 파일?

### 해결책
**YAML frontmatter**로 선언적 설정을 마크다운 상단에 배치한다.

### 표준 필드 정의

```yaml
# Command frontmatter
---
name: commit           # 필수: 식별자
description: ...       # 필수: 설명
allowed_tools: [...]   # 선택: 도구 제한
model: sonnet          # 선택: 모델 지정
---
```

```yaml
# Agent frontmatter
---
name: code-reviewer
model: sonnet
when_to_use: |         # 자동 트리거 조건
  Use when reviewing code...
allowed_tools: [Read, Grep, Glob]
color: blue            # 터미널 출력 색상
---
```

```yaml
# Skill frontmatter
---
name: frontend-design
description: ...
triggers:              # 키워드 트리거
  - "/ui"
  - "build UI"
---
```

```yaml
# Hook frontmatter
---
name: security-check
event: PreToolUse      # 이벤트 타입
match_tools: [Bash]    # 매칭 도구
type: prompt           # prompt | command
---
```

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. 선언적 설정 = 코드 없이 동작 정의
2. 표준 필드 = 일관된 플러그인 구조
3. 마크다운 본문 = 프롬프트/지시사항
─────────────────────────────────────────────────
```

---

## Pattern 8: Workflow Orchestration

마지막 패턴은 앞의 모든 패턴을 **하나로 엮는** 방법이다. 병렬 에이전트, 신뢰도 필터링, 점진적 공개... 이것들을 어떻게 조합해서 일관된 워크플로우를 만드는가.

### 문제
복잡한 기능 개발은 여러 단계를 거쳐야 한다. 분석 → 설계 → 구현 → 검증. 어떻게 구조화하나?

### 해결책
**Phase 기반 워크플로우**로 단계별 진행과 승인 게이트를 정의한다.

### 구현: feature-dev 7-Phase

```markdown
## Phase 1: Discovery
Understand the request. Ask clarifying questions.

## Phase 2: Codebase Exploration
Launch 2-3 code-explorer agents in PARALLEL.
Wait for completion.

## Phase 3: Clarifying Questions (GATE)
Present findings and ask:
- Scope confirmation
- Technical constraints
- Priority decisions

**WAIT FOR USER APPROVAL BEFORE PROCEEDING**

## Phase 4: Architecture Design
Launch 2-3 code-architect agents in PARALLEL.
Present multiple approaches:
- Minimal changes
- Clean architecture
- Pragmatic balance

**WAIT FOR USER SELECTION**

## Phase 5: Implementation
Execute chosen approach step by step.

## Phase 6: Quality Review
Launch 3 code-reviewer agents in PARALLEL.
Fix any issues found.

## Phase 7: Summary
Present:
- Changes made
- Files modified
- Testing recommendations
```

### 핵심 요소

| 요소 | 목적 |
|------|------|
| **Phase 번호** | 명확한 진행 단계 |
| **PARALLEL 지시** | 병렬 실행 트리거 |
| **GATE / WAIT** | 사용자 승인 동기화 |
| **Options 제시** | 선택권 부여 |

### 핵심 인사이트

```
★ Insight ─────────────────────────────────────
1. Phase = 진행 상황 가시성
2. GATE = 자율 실행 방지, 사용자 통제권
3. 병렬 → 동기화 → 병렬 = 효율적 파이프라인
─────────────────────────────────────────────────
```

---

## 종합: 패턴 조합 사례

8가지 패턴을 개별적으로 봤다. 하지만 진짜 힘은 **조합**에서 나온다. 이 패턴들이 어떻게 하나의 플러그인에서 함께 작동하는지 보자.

### 고급 플러그인 설계

가상의 "고급 분석 플러그인"을 설계한다면 이런 구조가 된다.

```
plugin-advanced/
├── .mcp.json                    # Pattern 5: MCP Integration
├── commands/
│   └── advanced-workflow.md     # Pattern 8: Workflow Orchestration
│       ├── YAML frontmatter     # Pattern 7: Frontmatter Config
│       └── Phase definitions
├── agents/
│   ├── analyzer-1.md            # Pattern 1: Parallel Execution
│   ├── analyzer-2.md
│   └── reviewer.md              # Pattern 4: Confidence Scoring
├── skills/
│   └── domain-expert.md         # Pattern 3: Context Triggers
│       └── Progressive content  # Pattern 6: Progressive Disclosure
└── hooks/
    ├── session-setup.md         # Pattern 2: SessionStart Injection
    └── security-check.md        # Pattern 2: PreToolUse Guard
```

### 실행 흐름

```mermaid
flowchart TD
    START[/advanced-workflow] --> HOOK1[SessionStart Hook]
    HOOK1 --> P1[Phase 1: Discovery]
    P1 --> P2[Phase 2: Parallel Analysis]
    P2 --> A1[analyzer-1]
    P2 --> A2[analyzer-2]
    A1 --> SYNC[Wait for all]
    A2 --> SYNC
    SYNC --> P3[Phase 3: Gate]
    P3 --> P4[Phase 4: Review]
    P4 --> HOOK2[PreToolUse Hook]
    HOOK2 --> R1[reviewer with 80% threshold]
    R1 --> P5[Phase 5: Complete]
```

---

## 결론

처음에 물었다. 공식 플러그인에는 어떤 설계 철학이 담겨 있는가?

답은 이 8가지 패턴이다. 이것들을 조합하면 단순한 프롬프트가 아닌 **체계적인 워크플로우 시스템**이 된다.

| 목표 | 패턴 조합 |
|------|----------|
| 빠르고 다양한 분석 | 1 + 4 (Parallel + Confidence) |
| 자동 스타일 적용 | 2 + 7 (Hook + Frontmatter) |
| 외부 서비스 연동 | 3 + 5 (Skill + MCP) |
| 효율적 문서화 | 6 + 7 (Progressive + Frontmatter) |
| 복잡한 기능 개발 | 1 + 4 + 8 (Parallel + Confidence + Workflow) |

이론은 충분하다. 이제 직접 만들어볼 차례다. 다음 글에서는 공식 플러그인 `code-simplifier`를 기반으로 **나만의 플러그인을 처음부터 끝까지 만드는** 실전 가이드를 다룬다.

---

## References

- [anthropics/claude-code/plugins](https://github.com/anthropics/claude-code/tree/main/plugins)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [Claude Code Docs - Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [MCP Specification](https://modelcontextprotocol.io/)
