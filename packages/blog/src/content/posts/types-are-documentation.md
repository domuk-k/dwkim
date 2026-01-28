---
title: "타입은 문서다"
description: "TypeScript 개발자의 Python 길들이기 - Any는 해상도가 낮다는 신호"
pubDate: "2026-01-27"
---

# 타입은 문서다

> TypeScript 개발자의 Python 길들이기

⸻

## 들어가며

TypeScript 프로젝트에서는 당연하던 것들이 Python에서는 없었다. 빨간 밑줄 없이 조용히 통과하는 코드. `Optional`인지 아닌지 추측해야 하는 함수 시그니처.

Pydantic을 쓰고 있었다. 런타임에서 필드 누락이나 타입 불일치는 잡아준다. 하지만 **Pydantic은 런타임 검증이지 정적 분석이 아니다.** 코드를 실행하기 전까지는 `model.user_nam` 같은 오타도, `set.values()` 같은 존재하지 않는 메서드 호출도 모른다.

이번에 팀 프로젝트에 pyright standard 모드를 도입하면서, 런타임 전에 잡을 수 있는 것들이 생각보다 많다는 걸 알게 됐다. 이 글은 그 과정에서 느낀 것들—타입이 왜 단순한 "검사 도구"가 아니라 **문서**인지—에 대한 기록이다.

> "Do you always read comments in code? I don't. Hours of code reading trained my eyes and my brain to ignore them as much as they can." — [Why you should use TypeScript](https://rocambille.github.io/en/2020/07/15/why-you-should-use-typescript-a-tale-of-self-documented-code/)

주석은 무시하게 된다. 하지만 타입은 컴파일러가 강제한다. **타입은 그 자체가 의도를 표현하고, 에이전트(사람, AI)들이 코드를 더 잘 이해하게 만든다.**

⸻

## Any는 해상도가 낮다는 신호

pyright를 켜자마자 한 파일에서 유독 빨간 줄이 많았다. 원인을 추적하니 시작점이 보였다.

```python
# 누군가가 작성한 인터페이스
structured_model: Any = None
```

`Any`. "일단 뭐든 받을 수 있게"라는 의도였을 것이다. 하지만 실제 OpenAI SDK의 타입 정의를 보면:

```python
# .venv/.../openai/lib/_parsing/_completions.py
response_format: type[ResponseFormatT] | ResponseFormat | Omit
```

SDK는 `type[BaseModel]` (클래스 자체)을 받지, 인스턴스를 받지 않는다. 하지만 `Any`로 선언하는 순간, 이 정보는 사라진다.

결과물은 이랬다:

```python
if isinstance(structured_model, BaseModel):  # SDK는 인스턴스 안 받음
    normalized_response_format = structured_model.model_dump()
elif isinstance(structured_model, dict):  # OK
    normalized_response_format = structured_model
elif isinstance(structured_model, (str, int, float, list)):  # 대체 왜?
    ...
else:
    ...  # pyright: ignore
```

30줄의 방어 코드. `isinstance` 분기 난무. 마지막엔 `pyright: ignore`로 빨간 줄만 없앤 흔적.

**Any는 해상도가 낮다는 신호다.** 카메라 초점이 안 맞으면 보이는 게 흐릿해지듯, 타입 해상도가 낮으면 코드도 흐릿해진다.

⸻

## pyright가 찾아낸 것들

이 문제만 있었던 게 아니다. pyright standard 모드를 켜니 숨어 있던 버그들이 줄줄이 나왔다.

| 파일 | 버그 | 설명 |
|------|------|------|
| `chat.py` | `default_factory=lambda: get_uuid` | 함수 호출 안 됨 (괄호 누락) |
| `rag_nodes.py` | `= list[T]` | 타입 어노테이션 문법 오류 (`:` 아님) |
| `rag_nodes.py` | `set.values()` | set에는 values() 메서드 없음 |
| `langfuse_client.py` | `list + str` | 타입 불일치 연산 |
| `handlers.py` | `self.cache_repository` | 속성명 오타 (`_cache_repository`) |

모두 런타임까지 가야 발견되던 것들이다. 하지만 이제는 에디터에서 빨간 줄이 뜬다. **배포 전에 잡을 수 있다는 건, 새벽 3시에 안 깨도 된다는 뜻이다.**

⸻

## 타입이 문서인 이유

여기서 궁금증이 생길 수 있다. "타입 검사가 좋은 건 알겠는데, 왜 '문서'라고 부르는가?"

세 가지 이유가 있다.

### 1. 항상 정확하다

주석은 코드와 동기화되지 않는다. 6개월 전 작성된 주석이 지금 코드와 맞을 보장이 없다. 하지만 타입은 컴파일러가 강제한다.

```python
# 주석: user_id는 정수입니다  ← 거짓말일 수 있음
def get_user(user_id):
    ...

# 타입: 컴파일러가 검증
def get_user(user_id: int) -> User:
    ...
```

### 2. 의도를 표현한다

```python
# Any = "해상도 낮음, 뭐든 들어올 수 있음"
structured_model: Any

# 명시적 = "Pydantic 클래스 또는 dict만 받음"
structured_model: type[BaseModel] | dict | None
```

후자를 읽으면 SDK 문서를 안 봐도 "아, 클래스 타입이나 dict를 넘기면 되는구나"를 알 수 있다.

### 3. 도구가 읽는다

타입은 사람만 읽는 게 아니다:
- **IDE**: 자동완성, 정의로 이동
- **정적 분석기**: pyright, mypy가 버그 탐지
- **AI 에이전트**: Claude, Copilot이 맥락 이해

> "Static typing helps catch errors early in the development cycle and improves code quality by making code more self-documenting." — [Why Static Typing is the Future](https://www.xevlive.com/2025/05/05/why-static-typing-is-the-future-of-software-development/)

⸻

## 내겐 당연하지만

TypeScript를 쓰다 보면 당연해지는 습관들이 있다. Python에서도 똑같이 하면 되는데, 현실은 달랐다.

**인터페이스 만들기 전에 의존성 타입 확인** — OpenAI SDK의 `.pyi` 파일을 열어보면 `response_format`이 뭘 받는지 명확히 나와 있다. 하지만 현실에서는 "일단 Any로 하면 되겠지"가 먼저 나온다.

**pyright ignore 쓰기 전에 왜 에러인지 확인** — 빨간 줄이 뜨면 끄고 싶은 게 인지상정이다. 하지만 그 빨간 줄이 실제 버그를 가리키고 있을 수 있다. `set.values()` 에러가 바로 그랬다.

**외부 SDK의 타입 정의 읽어보기** — `.pyi` 파일이나 `py.typed` 마커가 있는 패키지는 타입 정보가 있다. 대부분 존재조차 모르고 지나친다.

⸻

## 마치며

이번 PR에서 **-89줄**을 줄였다. 타입을 제대로 정의하니 죽은 분기가 사라졌다.

```python
# Before: Any로 시작해서 30줄의 isinstance 분기
structured_model: Any = None
if isinstance(structured_model, BaseModel): ...
elif isinstance(structured_model, dict): ...
# ... 온갖 타입에 대한 방어 코드

# After: 타입 명시로 10줄
structured_model: type[BaseModel] | dict | None = None
if structured_model is None: ...
elif isinstance(structured_model, dict): ...
else: ...  # type[BaseModel] 확정
```

배운 것 세 가지:

1. **Any는 부채다** — 나중에 누군가 갚아야 한다
2. **pyright ignore는 경고등이다** — 끄지 말고 원인을 찾아라
3. **타입은 계약이다** — 구현 전에 계약(인터페이스)부터 확인하라

TypeScript 개발자로서 Python을 쓰면서 답답했던 것들이, pyright 하나로 많이 해소됐다. Python도 타입이 문서가 될 수 있다.

⸻

## References

- [Why you should use TypeScript: a tale of self-documented code](https://rocambille.github.io/en/2020/07/15/why-you-should-use-typescript-a-tale-of-self-documented-code/)
- [Why Static Typing is the Future of Software Development](https://www.xevlive.com/2025/05/05/why-static-typing-is-the-future-of-software-development/)
- [Self-documenting Code](https://lackofimagination.org/2024/10/self-documenting-code/)
- [OpenAI Python SDK - Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [PR: pyright standard 모드 도입](https://github.com/coxwave/ax-proj-tap-langgraph/pull/1)
