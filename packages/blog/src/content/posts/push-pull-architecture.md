---
title: "밀 것인가, 당길 것인가"
description: "분산 시스템의 Push/Pull을 뜯다 황금비와 뇌과학을 만났어요. 시스템 설계부터 인간 인지까지."
pubDate: "2025-12-30"
---

# 밀 것인가, 당길 것인가

## 전화와 문자의 차이

> 친구가 소식을 전하는 두 가지 방법이 있어요.
>
> **첫 번째**: 갑자기 전화가 와요. "야, 나 합격했어!"
> → 즉각적이에요. 하지만 내가 뭘 하고 있든 끊겨요.
>
> **두 번째**: 문자가 와요. 나중에 시간 날 때 확인해요.
> → 내 타이밍이에요. 하지만 늦게 알 수도 있어요.

이게 **Push**와 **Pull**의 전부예요.

<div class="callout callout-term">
<div class="callout-title">💡 Push / Pull</div>
<div class="callout-content">
<p>**Push** = 밀다. 정보가 나에게 "밀려와요".</p>
<p>**Pull** = 당기다. 내가 정보를 "당겨와요".</p>
<p>시스템 설계의 가장 근본적인 선택지 중 하나예요.</p>
</div>
</div>


---

## 코드에서 질문이 생겼어요

분산 시스템을 설계하다 보면 항상 이 질문을 만나요.

```
Webhook vs Polling?
Event-driven vs Request-response?
Kafka consumer: push or pull?
```

> "언제 밀고, 언제 당겨야 하지?"

파고들었어요. 그리고 황금비를 만났어요<sup>[[1]](#ref-1)</sup>.

---

## 황금비의 비밀

2011년, Van Houdt는 분산 시스템에서 Push와 Pull을 수학적으로 비교했어요<sup>[[1]](#ref-1)</sup>.

결론이 아름다웠어요:

$$
\text{Push가 우월} \iff \lambda < \varphi - 1
$$

여기서 $\varphi$는 **황금비**예요:

$$
\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618
$$

<div class="callout callout-term">
<div class="callout-title">💡 황금비 (Golden Ratio)</div>
<div class="callout-content">
<p>자연과 예술에서 반복적으로 나타나는 비율.</p>
<p>피보나치 수열의 극한값이기도 해요.</p>
<p>분산 시스템의 최적점에서도 등장한다니, 신기하죠?</p>
</div>
</div>


풀어서 쓰면 $\varphi - 1 \approx 0.618$이에요.

**해석**:
- 시스템 부하($\lambda$)가 낮을 때 → **Push**가 효율적
- 시스템 부하가 높아질수록 → **Pull**이 효율적

직관적으로도 맞아요. 한가할 때는 바로바로 알려주는 게 좋지만, 바쁠 때는 "필요할 때 가져가"가 더 나아요.

더 일반적인 공식도 있어요:

$$
\text{Push 우월} \iff 2\lambda < (R + 1)^2 + 4(R + 1) - (R + 1)
$$

$R$은 프로브 레이트예요. 복잡해 보이지만, 결국 **"상황에 따라 최적점이 달라진다"**는 거예요.

---

## 뇌가 먼저 알았어요

재밌는 건, 우리 뇌도 Push/Pull로 작동해요.

인지과학에서는 이걸 **외인성/내인성 주의**라고 불러요<sup>[[2]](#ref-2)</sup>.

| 구분 | Push (외인성) | Pull (내인성) |
|------|--------------|--------------|
| 영어 | Exogenous Attention | Endogenous Attention |
| 작동 | 자극이 주의를 "끌어감" | 내가 주의를 "보냄" |
| 속도 | **~100ms** | **~300ms** |
| 특징 | 반사적, 자동적 | 의도적, 유연함 |

$$
t_{\text{exogenous}} \approx 100\text{ms} \quad \ll \quad t_{\text{endogenous}} \approx 300\text{ms}
$$

Push가 3배 빨라요. 뇌가 외부 자극에 먼저 반응하도록 설계된 거예요. 생존에 유리하니까요.

> 호랑이가 나타나면 "생각"하기 전에 "반응"해야 해요.

하지만 대가가 있어요:

<div class="callout callout-term">
<div class="callout-title">💡 Notification Fatigue (알림 피로)</div>
<div class="callout-content">
<p>과도한 Push 알림이 인지 부하를 높이고,</p>
<p>결국 무시하거나 비활성화하게 만드는 현상이에요.</p>
</div>
</div>


연구에 따르면<sup>[[3]](#ref-3)</sup>:
- 시간당 10개 이상 알림 → 응답률 **52% 하락**
- 2020년 이후 알림량 **97% 증가**
- 사용자의 **47%**가 첫 주 내에 알림을 꺼버림

뇌는 Push에 빠르게 반응하지만, 과부하가 오면 **시스템을 꺼버려요**.

---

## 1953년, 슈퍼마켓에서

Toyota의 Taiichi Ohno는 미국 슈퍼마켓을 보고 깨달았어요<sup>[[4]](#ref-4)</sup>.

> "고객이 선반에서 물건을 **당겨간다**.
> 빈 자리가 생기면 그때 **채운다**.
> 미리 밀어넣지 않는다."

이게 **Pull 시스템**의 시작이에요.

<div class="callout callout-term">
<div class="callout-title">💡 Kanban (칸반)</div>
<div class="callout-content">
<p>일본어로 "신호판"이라는 뜻이에요.</p>
<p>필요할 때만 생산을 시작하는 Pull 기반 시스템.</p>
<p>Toyota Production System의 핵심이에요.</p>
</div>
</div>


**Push 생산**: 예측해서 미리 만들어 둠 → 재고 쌓임
**Pull 생산**: 필요할 때 만듦 → 낭비 최소화

소프트웨어 개발에서도 마찬가지예요:

| Push | Pull |
|------|------|
| 매니저가 태스크 할당 | 개발자가 백로그에서 선택 |
| 스프린트 시작 전 모든 계획 확정 | WIP 제한 내에서 유동적으로 |
| 예측 기반 | 수요 기반 |

---

## 트레이드오프 지도

```
                    타이밍 중요
                         ↑
                         │
         Webhook ────────┼──────── Push Notification
                         │
    제어권 ←─────────────┼─────────────→ 즉시성
                         │
         Polling ────────┼──────── Long Polling
                         │
                         ↓
                    제어권 중요
```

| 패턴 | Push/Pull | 언제 쓰나요 |
|------|-----------|-----------|
| Webhook | Push | 이벤트 발생 즉시 알아야 할 때 |
| SSE | Push | 서버 → 클라이언트 단방향 스트림 |
| Polling | Pull | 간단하고 클라이언트가 제어하고 싶을 때 |
| Long Polling | 하이브리드 | 실시간성과 호환성 둘 다 필요할 때 |
| Kafka Consumer | Pull | 소비자가 자기 속도로 처리할 때 |

핵심 격언이 있어요:

> **"Use push when timing matters.**
> **Use pull when control matters.**
> **Combine both when resilience matters."**

---

## Observer에서 Pub/Sub으로

코드 레벨에서도 Push/Pull이 진화했어요.

**Observer 패턴** (1994, GoF):
```
Subject ──직접 알림──→ Observer
```
- 둘이 서로를 알아요
- 동기적이에요
- 같은 프로세스 안에서 동작해요

**Pub/Sub 패턴**:
```
Publisher ──→ [Broker] ──→ Subscriber
```
- 서로 몰라요
- 비동기적이에요
- 분산 환경에서 동작해요

<div class="callout callout-term">
<div class="callout-title">💡 Decoupling (디커플링)</div>
<div class="callout-content">
<p>컴포넌트 간 의존성을 줄이는 것.</p>
<p>Observer → Pub/Sub으로 가면서 디커플링이 강해졌어요.</p>
</div>
</div>


진화의 방향:

$$
\text{Coupling} \xrightarrow{\text{Broker 도입}} \text{Decoupling} \xrightarrow{\text{비동기화}} \text{Resilience}
$$

---

## Polling vs Interrupt

하드웨어 레벨에서도 같은 고민이 있어요<sup>[[5]](#ref-5)</sup>.

| | Polling (Pull) | Interrupt (Push) |
|---|---|---|
| 방식 | CPU가 계속 확인 | 장치가 CPU에 신호 |
| 장점 | 단순함, 예측 가능 | 효율적, 즉각적 |
| 단점 | CPU 낭비 | 복잡함, 경쟁 조건 |

```c
// Polling
while (true) {
    if (device_ready()) {
        process();
    }
}

// Interrupt
void ISR() {  // Interrupt Service Routine
    process();
}
```

> "Interrupt가 더 효율적이지만, Polling이 더 예측 가능해요."

현대 시스템은 둘을 섞어요. 기본은 Interrupt, 과부하 시 Polling으로 전환하는 **Interrupt Coalescing** 같은 기법이 있어요.

---

## 인간은 Pull을 원해요

2024년 HCI 연구<sup>[[6]](#ref-6)</sup>가 재밌는 걸 발견했어요.

> **Proactive(Push) 모드**: 성능 ↑, 인지 부하 ↓
> **Reactive(Pull) 모드**: 성능 ↓, 하지만 사용자가 선호

효율은 Push가 높아요. 하지만 인간은 **통제감**을 원해요.

$$
\text{User Satisfaction} = f(\text{Efficiency}, \text{Control})
$$

효율만 높인다고 만족도가 올라가지 않아요. 통제감이 떨어지면 불안해져요.

그래서 최고의 시스템은:
1. **기본은 Pull** — 사용자가 원할 때 정보를 가져감
2. **중요한 건 Push** — 긴급한 것만 밀어넣음
3. **제어권 제공** — 언제, 어떻게 받을지 선택하게 함

---

## 마치며

Webhook을 붙이다가 시작된 질문이 황금비와 뇌과학까지 이어졌어요.

**"밀 것인가, 당길 것인가"**는 단순한 기술 선택이 아니에요.

- 수학적으로는 **부하율과 황금비**의 관계
- 인지적으로는 **반사 vs 의도**의 균형
- 철학적으로는 **효율 vs 통제**의 트레이드오프

Toyota의 Ohno가 슈퍼마켓에서 본 것, Valiant가 수식으로 증명한 것, 인지과학자들이 뇌에서 발견한 것 — 결국 같은 이야기예요.

> **타이밍이 중요하면 밀어요.**
> **통제가 중요하면 당겨요.**
> **회복력이 중요하면 섞어요.**

시스템도, 조직도, 뇌도 이 원칙을 따라요.

---

## 참고

<span id="ref-1">[1]</span> B. Van Houdt, [*"A Fair Comparison of Pull and Push Strategies in Large Distributed Networks"*](https://www.researchgate.net/publication/256002551), IEEE/ACM QEST, 2011

<span id="ref-2">[2]</span> Carrasco, M., [*"Differential impact of endogenous and exogenous attention on activity in human visual cortex"*](https://www.nature.com/articles/s41598-020-78172-x), Scientific Reports, 2020

<span id="ref-3">[3]</span> Morrison et al., [*"The Effect of Timing and Frequency of Push Notifications"*](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0169162), PLOS ONE, 2017

<span id="ref-4">[4]</span> Ohno, T., *"Toyota Production System: Beyond Large-Scale Production"*, Productivity Press, 1988

<span id="ref-5">[5]</span> Silberschatz et al., *"Operating System Concepts"*, Wiley, 10th Edition

<span id="ref-6">[6]</span> de Jong et al., [*"Comparison of proactive and reactive interaction modes"*](https://www.sciencedirect.com/science/article/abs/pii/S0003687024000462), Applied Ergonomics, 2024

---

## Related

- [[bsp-parallel-model]]
- [[moc-ai-agent]]
