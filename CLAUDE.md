# Claude Code Working Rules

## 프로젝트 개요

**IP Review Desk**: 변리사 실무용 상표 검토 요청 자동화 웹앱

목표: 1차 검토 준비 시간 60% 이상 단축

범위: 상표 검토 요청 접수 → 지정상품/류/유사군 후보 → 검색 → 회신 초안 → 사건 초안

## 핵심 아키텍처 원칙

### 1. Port-Adapter 패턴 (필수)
- 모든 외부 소스(KIPRIS, Gmail, LLM)는 **Port 인터페이스**로 정의
- 구현은 **Adapter**(Provider)로 교체 가능
  - TrademarkProvider: mock / kipris / python-sidecar
  - MailProvider: gmail-api / gmail-forward / manual
  - LlmProvider: anthropic / openai / fallback

### 2. 패키지 분리 (필수)
- `packages/domain`: 타입, 포트, 엔티티 (프레임워크 미사용)
- `packages/db`: Prisma, Repository 패턴
- `packages/kipris-client`: KIPRIS 어댑터들
- `packages/llm-engine`: LLM 기반 기능 (파싱, 후보 생성, 초안)
- `packages/workflows`: Business logic 오케스트레이션
- `apps/web`: Next.js 프론트엔드 + API routes
- `apps/worker`: 백그라운드 작업자
- `apps/py-adapters`: Python 보조 서비스 (선택사항)

### 3. 데이터 흐름 (필수)
```
[메일/입력] 
  → inquiry (원문 저장)
  → parsed_request (구조화)
  → candidate_run → goods_candidates (후보)
  → search_job → search_results (검색)
  → review_report (검토)
  → case_draft (사건 초안)
```

## 코드 작성 규칙

### Import/Export
- **절대 금지**: React 컴포넌트에서 Prisma/DB 직접 호출
- **필수**: API route → Repository → Service/Workflow → Provider 순서
- **Path Alias**: 항상 `@ip-review/*`로 import (상대 경로 금지)

### Database 접근
```typescript
// ✅ 올바름
import { InquiryPrismaRepository } from "@ip-review/db/repositories";
const repo = new InquiryPrismaRepository(prisma);
const inquiry = await repo.getById(id);

// ❌ 금지
import { prisma } from "@ip-review/db";
const inquiry = await prisma.inquiry.findUnique({ where: { id } });
```

### XML 정규화
- KIPRIS로부터 받은 모든 XML은 **`packages/kipris-client`**에서만 JSON으로 변환
- 다른 곳에서 XML 처리 금지

### LLM 호출
```typescript
// ✅ Provider 인터페이스 사용
const llm = new DevFallbackStructuredLlmProvider();
const parsed = await llm.structured({
  system: "...",
  user: "...",
  schema: ParsedInquirySchema,
  schemaName: "ParsedInquirySchema"
});

// ❌ 직접 호출 금지
const client = new Anthropic();
const response = await client.messages.create(...);
```

### Error Handling
- API routes: request validation → business logic → error handling → JSON response
- 모든 에러는 로깅 + 구조화된 메시지로 반환
- 사용자 직결된 에러는 명확한 메시지로

### 테스트 작성
- Domain logic (Parser, Generator, Workflow): 단위 테스트
- Repository 쿼리: 통합 테스트 (실제 DB)
- API routes: E2E 테스트 (전체 파이프라인)

## 개발 흐름

### 1. 로컬 환경 설정
```bash
cp .env.example .env.local
docker-compose -f docker-compose.dev.yml up -d
pnpm install
pnpm db:reset  # migration + seed
pnpm db:studio  # Prisma Studio 확인
```

### 2. 개발 중
```bash
pnpm dev  # 모든 apps 동시 실행
pnpm db:migrate  # DB 스키마 변경 후
pnpm db:seed  # seed 데이터 추가 후
```

### 3. 배포 전
```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
```

## Provider Mode 전환

```typescript
// 현재 (개발용)
TRADEMARK_PROVIDER_MODE=mock

// API 승인 후
TRADEMARK_PROVIDER_MODE=kipris

// 실험용
TRADEMARK_PROVIDER_MODE=python-sidecar
```

## 기억할 것

1. **완벽한 자동화 금지**: AI는 추천만, 최종 판단은 사람
2. **근거 노출 필수**: 모든 후보/결과에 출처 명시
3. **버전 관리 필수**: 상품명칭·유사군 변경 이력 추적
4. **캐싱 중요**: KIPRIS 월 1,000건 무료 제한 → 호출 최소화
5. **사람 승인 필수**: 외부 시스템 반영 전 관리자 확인

## 주요 명령어

```bash
# 개발
pnpm dev

# DB 관리
pnpm db:migrate        # 마이그레이션 생성 및 적용
pnpm db:seed           # Seed 데이터 초기화
pnpm db:studio         # Prisma Studio 실행
pnpm db:reset          # 모든 데이터 초기화 (개발용만!)

# 빌드 & 테스트
pnpm build
pnpm lint
pnpm type-check
pnpm test

# 코드 정리
pnpm format
pnpm clean
```

## 다음 단계

1. ✅ Monorepo bootstrap
2. ⬜ Core packages (Domain, DB)
3. ⬜ Next.js App (Auth, Layout)
4. ⬜ Inbox screens (Prisma 연결)
5. ⬜ Parse → Candidates → Search
6. ⬜ Review → Export
7. ⬜ Settings (Admin)

---

**Last Updated**: 2026-04-01  
**Version**: 0.1.0-alpha
