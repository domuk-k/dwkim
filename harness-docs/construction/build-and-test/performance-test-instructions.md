# Performance Test Instructions — deployment-docs

> **N/A for this unit.** 문서 유닛은 성능 테스트 대상 아님.

다만 **문서화된 운영 행위의 성능 특성**은 측정 가치 있음:

## PT-1: Cold Start 레이턴시 (reference baseline)
Integration IT-4 참조. 결과를 `packages/persona-api/DEPLOY.md` Section 9 의 "~4-5초" 주장 옆 타임스탬프와 함께 갱신 권장.

## PT-2: 배포 소요 시간 (운영 지표)
- **dwkim CI publish**: GH Actions 전체 런타임 측정
  ```bash
  gh run list -w publish.yml -L 3 --json databaseId,name,status,conclusion,createdAt,updatedAt \
    --jq '.[] | [.name, .conclusion, ((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601))] | @tsv'
  ```
- **persona-api fly deploy**: `time fly deploy` 로 수동 측정 (Docker 빌드 + 머신 교체 합산, 현재 체감 ~2-4분)
- **blog Vercel build**: 대시보드 → Deployments → build duration 필드

**타깃** (현재 기준):
| 배포 | 현재 측정치 | 한계치 |
|------|-----------|--------|
| dwkim publish | ~3-5분 | 10분 |
| persona-api fly deploy | ~2-4분 | 7분 |
| blog Vercel build | ~1-2분 | 5분 |

초과 시 DEPLOY.md 에 원인 분석 항목 추가.

## PT-3: Rate Limit 정합성
```bash
# 문서의 "분당 100 요청" 주장이 실제 동작과 일치하는지
for i in {1..110}; do
  curl -o /dev/null -s -w "%{http_code}\n" https://persona-api.fly.dev/health
done | sort | uniq -c
```
**기대**: 100개 200, 10개 429 근처.
