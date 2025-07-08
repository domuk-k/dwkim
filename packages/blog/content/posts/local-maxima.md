---
title: "Local Maxima: 최적화의 함정과 극복 방법"
date: "2024-01-15"
description: "기계학습과 최적화에서 local maxima가 어떤 문제를 일으키고, 이를 어떻게 극복할 수 있는지 알아봅니다."
tags: ["machine-learning", "optimization", "algorithm"]
---

# Local Maxima: 최적화의 함정과 극복 방법

## 개요

Local Maxima(국소 최댓값)는 최적화 문제에서 빠지기 쉬운 함정 중 하나입니다. 전역 최댓값(Global Maximum)에 도달하지 못하고 국소적인 영역에서만 최적인 지점에 갇히는 현상을 말합니다.

## Local Maxima란?

Local Maxima는 다음과 같이 정의됩니다:

- 특정 지점 `x*`에서 그 주변의 모든 점들보다 함수값이 크거나 같은 지점
- 수학적으로: `f(x*) ≥ f(x)` for all `x` in some neighborhood of `x*`

```python
import numpy as np
import matplotlib.pyplot as plt

# Local maxima 예시 함수
def example_function(x):
    return -(x-2)**2 + 3 + 0.5*np.sin(5*x)

x = np.linspace(-1, 5, 1000)
y = example_function(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Local Maxima vs Global Maximum')
plt.xlabel('x')
plt.ylabel('f(x)')
plt.grid(True, alpha=0.3)
plt.show()
```

## 문제점

### 1. 기계학습에서의 Local Maxima

신경망 학습 과정에서 gradient descent가 local maxima에 갇히면:
- 더 나은 해가 존재함에도 불구하고 학습이 정체됨
- 모델의 성능이 최적이 아닌 상태로 수렴
- 전역 최적해를 찾지 못함

### 2. 최적화 알고리즘에서의 문제

```python
def gradient_descent_simple(initial_x, learning_rate=0.01, iterations=1000):
    """
    간단한 gradient descent 구현
    local maxima에 갇힐 수 있는 예시
    """
    x = initial_x
    history = [x]
    
    for i in range(iterations):
        gradient = compute_gradient(x)  # 그래디언트 계산
        x = x - learning_rate * gradient
        history.append(x)
        
        # Local maxima 체크
        if abs(gradient) < 1e-6:
            print(f"Local maxima에 도달: x={x:.4f}")
            break
    
    return x, history

def compute_gradient(x):
    """예시 함수의 그래디언트"""
    return -2*(x-2) + 2.5*np.cos(5*x)
```

## 해결 방법

### 1. 확률적 방법들

#### Random Restart
```python
def random_restart_optimization(func, bounds, num_restarts=10):
    """
    여러 초기값으로 최적화를 시작하여 global maximum 찾기
    """
    best_x = None
    best_value = float('-inf')
    
    for _ in range(num_restarts):
        # 랜덤 초기값
        initial_x = np.random.uniform(bounds[0], bounds[1])
        
        # 최적화 실행
        result_x, _ = gradient_descent_simple(initial_x)
        result_value = func(result_x)
        
        if result_value > best_value:
            best_value = result_value
            best_x = result_x
    
    return best_x, best_value
```

#### Simulated Annealing
```python
def simulated_annealing(func, initial_x, temperature=1000, cooling_rate=0.95):
    """
    담금질 기법으로 local maxima 탈출
    """
    current_x = initial_x
    current_value = func(current_x)
    best_x = current_x
    best_value = current_value
    
    while temperature > 0.01:
        # 이웃 해 생성
        neighbor_x = current_x + np.random.normal(0, 0.1)
        neighbor_value = func(neighbor_x)
        
        # 수락 확률 계산
        if neighbor_value > current_value:
            # 더 좋은 해면 항상 수락
            current_x = neighbor_x
            current_value = neighbor_value
        else:
            # 나쁜 해도 확률적으로 수락
            probability = np.exp((neighbor_value - current_value) / temperature)
            if np.random.random() < probability:
                current_x = neighbor_x
                current_value = neighbor_value
        
        # 최고값 업데이트
        if current_value > best_value:
            best_x = current_x
            best_value = current_value
        
        # 온도 감소
        temperature *= cooling_rate
    
    return best_x, best_value
```

### 2. 진화 알고리즘

```python
def genetic_algorithm(func, population_size=50, generations=100):
    """
    유전 알고리즘으로 global maximum 탐색
    """
    # 초기 집단 생성
    population = np.random.uniform(-5, 5, population_size)
    
    for generation in range(generations):
        # 적합도 평가
        fitness = [func(individual) for individual in population]
        
        # 선택, 교차, 변이 과정
        new_population = []
        for _ in range(population_size):
            # 토너먼트 선택
            parent1 = tournament_selection(population, fitness)
            parent2 = tournament_selection(population, fitness)
            
            # 교차
            child = crossover(parent1, parent2)
            
            # 변이
            child = mutate(child)
            
            new_population.append(child)
        
        population = np.array(new_population)
    
    # 최적해 반환
    final_fitness = [func(individual) for individual in population]
    best_idx = np.argmax(final_fitness)
    return population[best_idx], final_fitness[best_idx]
```

### 3. Adam Optimizer와 같은 고급 최적화 기법

```python
class AdamOptimizer:
    """
    Adam optimizer 구현
    momentum과 adaptive learning rate로 local maxima 완화
    """
    def __init__(self, learning_rate=0.001, beta1=0.9, beta2=0.999, epsilon=1e-8):
        self.learning_rate = learning_rate
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
        self.m = 0  # 1차 모멘트
        self.v = 0  # 2차 모멘트
        self.t = 0  # 시간 단계
    
    def update(self, gradient):
        self.t += 1
        
        # 모멘트 업데이트
        self.m = self.beta1 * self.m + (1 - self.beta1) * gradient
        self.v = self.beta2 * self.v + (1 - self.beta2) * gradient**2
        
        # 편향 보정
        m_hat = self.m / (1 - self.beta1**self.t)
        v_hat = self.v / (1 - self.beta2**self.t)
        
        # 파라미터 업데이트
        update = self.learning_rate * m_hat / (np.sqrt(v_hat) + self.epsilon)
        
        return update
```

## 실제 적용 사례

### 신경망 학습
- **배치 정규화**: 손실 함수의 지형을 부드럽게 만들어 local maxima 감소
- **드롭아웃**: 정규화 효과로 overfitting과 local maxima 방지
- **Learning Rate Scheduling**: 학습률을 동적으로 조정하여 탈출 능력 향상

### 하이퍼파라미터 최적화
- **베이지안 최적화**: 불확실성을 고려한 효율적인 탐색
- **Grid Search + Random Search**: 체계적이고 확률적인 탐색 결합

## 마무리

Local Maxima는 최적화 문제에서 피할 수 없는 도전이지만, 다양한 기법들을 통해 극복할 수 있습니다:

1. **다양한 초기값 시도**: Random restart, 멀티 모달 최적화
2. **확률적 탐색**: Simulated annealing, 유전 알고리즘
3. **고급 최적화**: Adam, RMSprop 등의 adaptive methods
4. **정규화 기법**: 배치 정규화, 드롭아웃 등

최적화 문제를 해결할 때는 단일 기법보다는 여러 방법을 조합하여 사용하는 것이 효과적입니다. 문제의 특성을 이해하고 적절한 방법을 선택하는 것이 global optimum에 도달하는 핵심입니다.