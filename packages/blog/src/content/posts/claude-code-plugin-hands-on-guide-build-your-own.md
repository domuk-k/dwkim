---
title: "나만의 Claude Code 플러그인 만들기 - 실전 가이드"
description: ""
pubDate: "2026-01-14"
---

# 나만의 Claude Code 플러그인 만들기 - 실전 가이드

> code-simplifier 플러그인을 클론하고, 테스트 자동화를 추가하는 과정을 따라해보자.

앞선 세 글에서 공식 플러그인의 설계 원칙을 분석했다. 이제 이론을 실전으로 옮길 차례다. 직접 만들어보면서 배운 것을 체화하자.

## TL;DR

- 공식 `code-simplifier` 플러그인을 기반으로 확장
- **테스트 자동 실행** 기능 추가 (원본에 없는 기능)
- 처음부터 끝까지 step-by-step 실습

---

## 1. 목표: code-simplifier-plus 플러그인

왜 처음부터 만들지 않고 기존 플러그인을 확장하는가? **좋은 코드를 읽는 것**이 좋은 코드를 쓰는 가장 빠른 길이기 때문이다. 공식 플러그인의 구조를 그대로 가져오고, 거기에 우리만의 기능을 추가한다.

### 원본 code-simplifier
- 코드 단순화 및 정리
- YAGNI 원칙 적용
- 불필요한 추상화 제거

### 우리가 추가할 기능
- **변경 후 자동 테스트 실행**
- **테스트 실패 시 롤백 제안**
- **변경 요약 리포트**

---

## 2. 프로젝트 구조 설계

먼저 전체 그림을 그려보자. 글 3에서 본 패턴들을 어떻게 적용할지 미리 계획한다.

```
~/.claude/plugins/code-simplifier-plus/
├── .claude-plugin/
│   └── plugin.json          ← 플러그인 메타데이터
├── commands/
│   └── simplify.md          ← /simplify 명령어
├── agents/
│   ├── code-simplifier.md   ← 코드 단순화 전문가
│   └── test-runner.md       ← 테스트 실행 전문가
└── hooks/
    └── post-simplify.md     ← 단순화 후 자동 테스트 (선택)
```

---

## 3. Step 1: 플러그인 초기화

구조를 정했으니 이제 만들기 시작하자. 가장 먼저 할 일은 플러그인 뼈대를 만드는 것이다.

### plugin.json 생성

```bash
mkdir -p ~/.claude/plugins/code-simplifier-plus/.claude-plugin
```

```json
// ~/.claude/plugins/code-simplifier-plus/.claude-plugin/plugin.json
{
  "name": "code-simplifier-plus",
  "version": "1.0.0",
  "description": "Simplify code with automatic test verification",
  "author": "Your Name",
  "commands": ["commands/*.md"],
  "agents": ["agents/*.md"],
  "hooks": ["hooks/*.md"]
}
```

---

## 4. Step 2: 핵심 Agent 작성

뼈대가 준비됐다. 이제 실제 작업을 수행할 Agent들을 만든다. 글 1에서 봤듯이, 각 Agent는 **하나의 전문 영역**에 집중해야 한다.

### code-simplifier.md

첫 번째 Agent는 코드 단순화 전문가다. YAGNI 원칙과 리팩토링 베스트 프랙티스를 담는다.

```yaml
# agents/code-simplifier.md
---
name: code-simplifier
model: sonnet
when_to_use: |
  Use when the user asks to simplify, clean up, or refactor code.
  Triggers: "simplify", "clean up", "reduce complexity", "YAGNI"
allowed_tools: [Read, Grep, Glob, Edit, Write]
color: green
---

# Code Simplifier Agent

## Role
You are a code simplification expert. Your job is to make code cleaner,
simpler, and more maintainable WITHOUT changing its behavior.

## Core Principles

### 1. YAGNI (You Aren't Gonna Need It)
- Remove unused code, imports, variables
- Delete commented-out code
- Remove "just in case" abstractions

### 2. Reduce Abstraction Layers
- Inline single-use functions (< 5 lines)
- Flatten unnecessary class hierarchies
- Remove wrapper-only functions

### 3. Simplify Control Flow
- Replace nested conditionals with early returns
- Use guard clauses
- Flatten callback pyramids

### 4. Preserve Behavior
- NEVER change functionality
- Keep all tests passing
- Maintain public API contracts

## Output Format

For each file simplified, report:
```
## File: path/to/file.ts

### Changes Made
1. [Description of change 1]
2. [Description of change 2]

### Lines Removed: X
### Lines Added: Y
### Net Change: -Z lines
```

## Confidence Check
Before each change, verify:
- [ ] Does NOT change behavior
- [ ] Improves readability
- [ ] Would pass code review
```

### test-runner.md

두 번째 Agent는 테스트 검증 전문가다. 코드 변경 후 테스트를 실행하고 결과를 보고한다. 이 Agent가 원본 code-simplifier에는 없는, 우리가 추가하는 기능이다.

```yaml
# agents/test-runner.md
---
name: test-runner
model: haiku
when_to_use: |
  Use after code modifications to verify tests still pass.
  Triggers: "run tests", "verify changes", "check tests"
allowed_tools: [Bash, Read]
color: blue
---

# Test Runner Agent

## Role
You verify that code changes haven't broken functionality by running tests.

## Process

### 1. Detect Test Framework
Look for:
- `package.json` → npm test, jest, vitest
- `pytest.ini` / `pyproject.toml` → pytest
- `Cargo.toml` → cargo test
- `go.mod` → go test
- `Makefile` → make test

### 2. Run Tests
Execute the appropriate test command.
Capture full output.

### 3. Report Results

**If ALL tests pass:**
```
✅ All tests passing

Test Summary:
- Total: X tests
- Passed: X
- Time: Y seconds
```

**If ANY tests fail:**
```
❌ Test failures detected

Failed Tests:
1. test_name - reason
2. test_name - reason

Recommendation:
- Review changes to [file]
- Consider rolling back [specific change]
```

## Important
- Run tests in the project root
- Use --verbose flag when available
- Capture stderr for error messages
```

---

## 5. Step 3: Command 작성 (오케스트레이터)

Agent들이 준비됐다. 이제 이들을 조율할 Command를 만든다. 글 1의 feature-dev처럼, Command가 전체 워크플로우를 오케스트레이션한다.

### simplify.md

```yaml
# commands/simplify.md
---
name: simplify
description: Simplify code with automatic test verification
allowed_tools: [Task, Read, Bash]
---

# /simplify Command

Simplifies code in the specified files or directories,
then automatically runs tests to verify nothing broke.

## Workflow

### Phase 1: Analysis
Identify files to simplify:
- If path provided: Use that path
- If no path: Analyze recently modified files

### Phase 2: Simplification
Launch `code-simplifier` agent with the target files.

Wait for completion and collect:
- List of modified files
- Summary of changes
- Lines added/removed

### Phase 3: Test Verification
Launch `test-runner` agent.

Wait for completion and check:
- All tests pass? → Proceed to summary
- Tests fail? → Present rollback options

### Phase 4: Rollback Decision (if tests failed)

Present options to user:
1. **Rollback all changes** - `git checkout -- [files]`
2. **Rollback specific file** - Interactive selection
3. **Keep changes anyway** - User accepts risk
4. **Fix failing tests** - Attempt to fix

**WAIT FOR USER DECISION**

### Phase 5: Summary

```markdown
## Simplification Complete

### Files Modified
- file1.ts (-15 lines)
- file2.ts (-8 lines)

### Total Impact
- Lines removed: 23
- Complexity reduced: ~15%

### Test Status
✅ All tests passing

### Changes
[Git diff summary]
```

## Usage Examples

```bash
# Simplify specific file
/simplify src/utils/helpers.ts

# Simplify directory
/simplify src/components/

# Simplify recent changes
/simplify
```
```

---

## 6. Step 4: 테스트 및 디버그

코드를 다 작성했다. 하지만 작성만으로는 부족하다. 실제로 동작하는지 확인해야 한다.

### 플러그인 활성화 확인

```bash
# Claude Code에서 실행
/plugins

# 출력에서 확인
# - code-simplifier-plus (active)
```

### 테스트 실행

```bash
# 간단한 테스트 파일 생성
echo "const unused = 'delete me'; export const used = 'keep';" > test-file.ts

# 플러그인 실행
/simplify test-file.ts
```

### 디버그 팁

```yaml
# 문제 발생 시 확인사항
1. plugin.json 경로가 정확한가?
2. YAML frontmatter 문법이 올바른가?
3. allowed_tools에 필요한 도구가 있는가?
4. when_to_use 트리거가 매칭되는가?
```

---

## 7. 고급 확장: Hook으로 자동화

기본 기능이 작동한다면, 한 단계 더 나아가보자. 글 2에서 Hook은 "작업을 감시하고 제어"한다고 했다. 단순화가 끝날 때마다 자동으로 테스트를 제안하면 어떨까?

### SubagentStop Hook (선택)

```yaml
# hooks/post-simplify.md
---
name: post-simplify-test
event: SubagentStop
match_agent: code-simplifier
type: prompt
---

## Auto-Test After Simplification

When the code-simplifier agent completes:

1. **Check if files were modified**
   - If no changes: Skip testing
   - If changes made: Proceed

2. **Recommend test execution**
   Suggest: "Changes were made. Run tests to verify?"

3. **Track metrics**
   Log simplification statistics for future reference.
```

---

## 8. 배포 및 공유

플러그인이 완성됐다. 이제 다른 사람과 공유하거나, 여러 프로젝트에서 사용할 수 있게 배포해보자.

### 로컬 사용

```bash
# 이미 ~/.claude/plugins/에 있으면 자동 로드
# 다른 위치라면 symlink 생성
ln -s /path/to/code-simplifier-plus ~/.claude/plugins/
```

### 팀 공유 (Git 저장소)

혼자만 쓰기엔 아깝다. 팀원들과 공유하려면 프로젝트 저장소에 포함시키면 된다.

```bash
# 프로젝트 저장소에 포함
cp -r ~/.claude/plugins/code-simplifier-plus ./plugins/

# .gitignore에서 제외 확인
# plugins/ 가 ignore되어있지 않아야 함

# 팀원은 symlink로 연결
ln -s $(pwd)/plugins/code-simplifier-plus ~/.claude/plugins/
```

### npm 패키지로 배포 (고급)

더 넓게 공유하고 싶다면 npm 패키지로 배포할 수도 있다.

```json
// package.json
{
  "name": "@myorg/code-simplifier-plus",
  "version": "1.0.0",
  "files": [".claude-plugin", "commands", "agents", "hooks"],
  "scripts": {
    "postinstall": "echo 'Link to ~/.claude/plugins/ for activation'"
  }
}
```

---

## 9. 전체 파일 구조 최종본

```
~/.claude/plugins/code-simplifier-plus/
├── .claude-plugin/
│   └── plugin.json
│       {
│         "name": "code-simplifier-plus",
│         "version": "1.0.0",
│         "description": "Simplify code with automatic test verification"
│       }
│
├── commands/
│   └── simplify.md
│       Phase 1: Analysis
│       Phase 2: Launch code-simplifier agent
│       Phase 3: Launch test-runner agent
│       Phase 4: Rollback decision (if needed)
│       Phase 5: Summary
│
├── agents/
│   ├── code-simplifier.md
│   │   - YAGNI 원칙
│   │   - 추상화 제거
│   │   - 제어 흐름 단순화
│   │
│   └── test-runner.md
│       - 프레임워크 감지
│       - 테스트 실행
│       - 결과 리포트
│
└── hooks/
    └── post-simplify.md (선택)
        - SubagentStop 이벤트
        - 자동 테스트 제안
```

---

## 10. 다음 단계

기본 플러그인이 작동한다면, 여기서 멈출 필요가 없다. 글 3에서 본 패턴들을 더 적용해보자.

### 확장 아이디어

1. **AI 코드 리뷰 통합**
   - code-reviewer agent 추가
   - 단순화 전후 품질 비교

2. **메트릭 대시보드**
   - 단순화 히스토리 추적
   - 복잡도 트렌드 시각화

3. **팀 규칙 커스터마이징**
   - CLAUDE.md 기반 규칙 로드
   - 프로젝트별 단순화 정책

4. **IDE 통합**
   - VS Code 확장과 연동
   - 파일 저장 시 자동 단순화

---

## 결론

네 편의 글을 통해 Claude Code 플러그인을 깊이 탐구했다.

1. **글 1**: 공식 플러그인이 **어떻게** 설계되었는지 분석
2. **글 2**: Command/Agent/Skill/Hook을 **언제** 써야 하는지 정리
3. **글 3**: 소스코드에 숨겨진 **8가지 패턴** 발굴
4. **글 4**: 직접 **만들면서** 체화 (이 글)

처음 던진 질문으로 돌아가보자. Claude Code 플러그인은 "그냥 프롬프트"일까?

아니다. **체계적으로 설계된 워크플로우 시스템**이다. 병렬 실행, 신뢰도 필터링, 점진적 공개... 단순히 지시문을 나열하는 것 이상의 설계 철학이 담겨 있다.

이제 도구는 갖췄다. 당신만의 플러그인을 만들어보자.

---

## References

- [anthropics/claude-plugins-official/code-simplifier](https://github.com/anthropics/claude-plugins-official/tree/main/code-simplifier)
- [Claude Code Docs - Building Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [이 시리즈의 GitHub 저장소](https://github.com/yourname/claude-plugin-analysis)
