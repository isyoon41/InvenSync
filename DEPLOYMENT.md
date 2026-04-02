# Vercel 배포 가이드

## 프로젝트 정보
- **프로젝트명**: InvenSync TM Assistant
- **배포 URL**: `https://invensync-tm-assistant.vercel.app`
- **프레임워크**: Next.js 14 (Monorepo with Turbo)

## 배포 전 준비사항

### 1. 필수 환경 변수 설정
Vercel 프로젝트의 Settings → Environment Variables에서 다음을 추가하세요:

| 환경변수 | 설명 | 예시 |
|---------|------|------|
| `ANTHROPIC_API_KEY` | Claude API 키 | `sk-ant-...` |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@host/db` |
| `NEXTAUTH_SECRET` | NextAuth 암호화 키 (32자 이상) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 인증 콜백 URL | `https://invensync-tm-assistant.vercel.app` |

### 2. Git 저장소 연결
1. [Vercel 대시보드](https://vercel.com/dashboard)로 이동
2. **Add New... → Project** 선택
3. GitHub 저장소 `isyoon41/InvenSync` 선택
4. **Import Project** 클릭

### 3. 프로젝트 설정
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (기본값)
- **Output Directory**: `apps/web/.next` (자동 감지됨)
- **Root Directory**: `./` (기본값)

## 배포 방법

### 옵션 1: Git 푸시를 통한 자동 배포
```bash
git push origin claude/trademark-review-webapp-QCRW2
```
- 자동으로 Vercel이 감지하고 배포
- `main` 또는 특정 브랜치 설정 가능

### 옵션 2: Vercel CLI를 통한 수동 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

## 배포 후 확인사항

### 1. 배포 상태 확인
- Vercel 대시보드에서 배포 로그 확인
- 모든 빌드 단계가 성공했는지 확인

### 2. 환경 변수 검증
```bash
# Vercel에서 제공하는 Environment Variables 확인
vercel env ls
```

### 3. 웹앱 기능 테스트
- URL: `https://invensync-tm-assistant.vercel.app`
- 로그인 페이지 접근 가능한지 확인
- 데이터베이스 연결 확인
- LLM API 호출 동작 확인

## 주의사항

### Database 마이그레이션
처음 배포 시 또는 스키마 변경 후:
```bash
# 로컬에서 먼저 테스트
pnpm db:migrate

# Vercel 배포 환경에서도 마이그레이션 필요
# (Vercel의 Environment 탭에서 환경변수 설정 후 수동 실행 고려)
```

### 성능 최적화
- Next.js 캐싱 활성화 (자동)
- 이미지 최적화 (Next.js Image 사용)
- API 라우트 최적화

### 비용 관리
- **무료 요금제**: 월 100GB 대역폭
- **Pro 요금제**: 월 $20부터
- Claude API 호출 비용은 별도 (Anthropic 청구)

## 문제 해결

### 빌드 실패
```
Error: Cannot find module '@ip-review/db'
```
**해결**: `pnpm install` 후 다시 배포

### 환경 변수 누락
```
Error: DATABASE_URL is not defined
```
**해결**: Vercel Settings → Environment Variables에서 모든 필수 변수 확인

### 데이터베이스 연결 실패
- DATABASE_URL이 정확한지 확인
- 방화벽/IP 화이트리스트 설정 확인
- 데이터베이스가 실행 중인지 확인

## 도움말

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Turbo 모노레포 배포](https://turbo.build/repo/docs/deploying)
