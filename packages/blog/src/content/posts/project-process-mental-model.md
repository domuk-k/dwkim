---
title: '프로젝트 수행 프로세스에 대한 나의 멘탈모델'
pubDate: '2025-03-17'
description: '프로젝트 수행 프로세스에 대한 나의 멘탈모델'
---

# 프로젝트 수행 프로세스에 대한 나의 멘탈모델

## 들어가며

최근 부트캠프 멘토링을 하면서 멘티들과 함께 여러 프로젝트를 진행했습니다. 그 과정에서 내가 평소 어떤 방식으로 프로젝트를 접근하고 수행하는지 체계화해볼 기회가 있었어요.

"프로젝트를 어떻게 시작해야 할까요?", "어떻게 나눠서 계획해야 하죠?"라는 질문을 받을 때마다, 나는 현상 파악부터 회고까지 일곱 단계로 답하곤 합니다. 실제로는 더 세분화되고 복잡하지만, 핵심적인 의사결정 지점들을 중심으로 정리하면 이렇습니다.

## 프로세스

### 1. 현상 파악

> 시스템 전체를 이해하는 것부터 시작합니다.

프로젝트 시작 전에 가장 먼저 하는 일은 현재 상황을 입체적으로 파악하는 것입니다. 단순히 "뭘 만들어야 하는가"를 넘어서, 기존 데이터 구조는 어떻게 되어 있는지, 인터페이스는 어떤 형태인지, 팀 구성과 역량은 어떤지까지 살펴봐요.

멘토링에서도 마찬가지였습니다. 멘티들에게 주어진 자료를 단순히 "해야 할 일"로만 보지 말고, 전체 시스템의 맥락에서 이해하라고 조언했어요. 학습용 프로젝트라고 해서 대충 접근하면 실제 프로덕션 환경에서 통하지 않는 습관이 생기거든요.

### 2. 요구사항 분석

> 흩어진 정보를 하나의 일관된 시스템 언어로 통합합니다.

실무에서는 기획 문서, 디자인 시안, API 스펙이 따로 노는 경우가 많아요. 이걸 개발자가 이해할 수 있는 형태로 통합하는 게 핵심입니다.

내 방식은 이렇습니다:

1. 디자인 시안(figma)에 특이사항 메모하면서 대략적인 유즈케이스 파악
2. 기획 문서를 [Dia 브라우저](https://www.diabrowser.com/)로 파악하고, LLM도구:[Claude code](https://www.anthropic.com/claude-code)를 활용해 기능별/도메인별로 분류한 md 작성
3. AI가 놓친 부분이나 시스템 관점에서 어색한 부분을 직접 보완

중요한 건 AI 도구를 단순한 정리 도구로 쓰는 게 아니라, 내가 놓칠 수 있는 관점을 찾는 파트너로 활용하는 것입니다. 그리고 결과물은 반드시 도메인 모델링 관점에서 검증해요.

- **도메인 모델링**: 비즈니스 로직을 기술에 종속되지 않게 추상화 → [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- **비기능적 요구사항**: 환경, 성능, 보안 등 주어진 제약이나 기준 → [Non-functional requirements](https://en.wikipedia.org/wiki/Non-functional_requirement)

### 3. 과업 정의

> 비즈니스 가치와 기술적 복잡도를 동시에 고려합니다.

분석된 요구사항을 실제 구현 가능한 작업 단위로 나누는 단계입니다. 기능적 요구사항(무엇을 해야 하는가)과 비기능적 요구사항(어떤 품질로 해야 하는가)을 모두 고려해야 해요.

특히 데이터 일관성, 사용자 경험, 성능 등을 시스템 전체 관점에서 균형 있게 설계하는 게 중요합니다. 팀 프로젝트에서는 각자의 강점을 살리면서도 전체적인 아키텍처 일관성을 유지할 수 있도록 과업을 배분해요.

- **이슈/티켓**: 구현 가능한 최소 작업 단위 → [User Story](https://www.atlassian.com/agile/project-management/user-stories), [Story Point](https://www.atlassian.com/agile/project-management/estimation) 개념 활용

### 4. 기술 스택 선정 & 아키텍처 설계

> 현재 요구사항과 미래 확장성을 동시에 고려합니다.

요구사항이 명확해지면 이를 구현할 기술적 방향을 결정합니다. 단순히 트렌디한 기술을 선택하는 게 아니라, 프로젝트의 특성과 팀의 역량, 그리고 향후 유지보수까지 고려한 의사결정이 필요해요.

데이터 저장/관리 전략, 클라이언트-서버 통신 방식, 상태 관리 패턴 등을 통합적으로 설계합니다. 이때 도메인 모델이 기술 스택에 종속되지 않도록 하는 것이 중요해요.

- **아키텍처 패턴**: 데이터 흐름과 책임 분리를 고려한 구조 설계 → [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), [Layered Architecture](https://martinfowler.com/bliki/LayeredArchitecture.html) 참고

### 5. 프로젝트 세팅 & 개발 환경 구축

> 개발부터 배포까지의 전체 파이프라인을 고려합니다.

개발 환경은 단순히 "코드를 짤 수 있는 환경"이 아니라, 팀이 효율적으로 협업하고 품질을 유지할 수 있는 시스템이어야 합니다.

코드 품질 관리, 문서화 체계, 배포 자동화 등을 초기에 설정해두면 나중에 기술 부채가 쌓이는 것을 방지할 수 있어요. 멘토링에서도 이런 프로세스를 경험하는 것 자체가 중요하다고 생각해서 가능한 한 실제 환경과 비슷하게 만들었습니다.

- **코드 품질**: 린트, 포맷터, 테스트 환경 구성 → [Pre-commit hooks](https://pre-commit.com/), [CI/CD](https://www.redhat.com/en/topics/devops/what-is-ci-cd) 파이프라인 활용

### 6. 구현/배포

> 지속적인 피드백과 개선을 통해 점진적으로 완성합니다.

정의된 과업을 실제 코드로 구현하고 배포하는 단계입니다. 개별 이슈를 커밋 단위로 관리하고, 코드 리뷰를 통해 품질을 유지해요.

이 과정에서 테스트, 성능 최적화, 리팩토링 등이 자연스럽게 포함됩니다. 중요한 건 완벽한 코드를 한 번에 만들려고 하지 않고, 지속적으로 개선해나가는 마인드셋이에요.

- **테스트**: 기능 테스트, 통합 테스트, 성능 테스트 → [Testing Pyramid](https://martinfowler.com/bliki/TestPyramid.html) 전략 적용

### 7. 회고

> 개인의 성장과 팀의 발전을 동시에 추구합니다.

프로젝트 완료 후에는 반드시 회고를 진행합니다. 기술적인 부분뿐만 아니라 협업 방식, 의사결정 과정, 문제 해결 접근법까지 포함해서 정리해요.

특히 새로운 기술이나 도구를 도입했을 때는 더 자세히 분석합니다. 뭐가 예상대로 작동했고, 뭐가 예상과 달랐는지, 다음에는 어떻게 접근할 건지를 구체적으로 정리해둬요.

- **회고 방법론**: [KPT](<https://en.wikipedia.org/wiki/KPT_(software_development)>), [4L](https://retrospectivewiki.org/index.php?title=4_Ls_Retrospective), [Start Stop Continue](https://retrospectivewiki.org/index.php?title=Start_Stop_Continue) 등 상황에 맞는 회고 방식 선택

## 멘토링을 통해 얻은 인사이트

이 프로세스를 멘티들과 함께 적용하면서 몇 가지 인사이트를 얻었습니다:

- **AI 도구 활용의 핵심은 전략적 사고**: 예를 들어 추가 기능을 기획할 때 [Figma Make](https://help.figma.com/hc/en-us/articles/1500005362262-Create-prototypes-with-Figma)로 [Supabase](https://supabase.com/)와 연동된 실제 동작하는 챗봇 프로토타입을 만들어보는 것처럼, 단순한 문서 작업을 넘어서 실제 검증 가능한 결과물을 만드는 데 활용해야 해요

- **프로세스의 일관성이 품질을 결정**: 매번 다른 방식으로 접근하면 놓치는 부분이 생기고, 팀원들과의 소통도 어려워집니다. 하지만 기본 틀을 유지하면서 상황에 맞게 유연하게 적용하는 것이 중요해요

- **시스템 전체를 바라보는 관점이 경쟁력**: 프론트엔드든 백엔드든 개별 기술보다는 전체 시스템에서 각 부분이 어떤 역할을 하는지 이해하는 것이 더 중요합니다

## 마무리

이 멘탈모델에 대한 몇 가지 생각:

- **완벽함보다는 지속적 개선**: 프로젝트 특성과 팀 상황에 따라 계속 발전시켜나가야 할 것 같아요
- **경험의 객관화**: 멘토링을 통해 내 접근 방식을 객관화하고, 다른 개발자들과 공유할 수 있는 형태로 정리할 수 있었습니다
- **앞으로의 방향**: 이런 경험을 바탕으로 더 나은 프로젝트 수행 방식을 찾아가려고 합니다
