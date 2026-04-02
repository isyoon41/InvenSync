# InvenSync MVP 1단계 - 상세 기술 스펙

## 개요
변리사를 위한 상표 검토 자동화 웹앱의 **MVP 1단계** 기술 스펙입니다.
- 목표: 웹 기반 접수함 → 검토 초안까지 자동화
- 범위: 메일 자동 수집 제외, 웹 입력 기반
- 기간: 4주 (1주씩 4 Phase)

---

## 1. API 엔드포인트 스펙

### 1.1 [접수함] - Inquiry Management

#### POST /api/inquiries
**신규 문의 접수**

```typescript
// Request
{
  "title": string;                    // 검토 제목 (e.g., "스마트폰 액세서리 상표 검토")
  "clientName": string;               // 고객명
  "companyName"?: string;             // 회사명 (선택)
  "clientEmail"?: string;             // 고객 이메일
  "content": string;                  // 상품/서비스 설명 (상세함)
  "proposedMarkName"?: string;        // 제안 상표명 (선택)
  "attachmentUrls"?: string[];        // 첨부파일 URL (선택)
  "tags"?: string[];                  // 카테고리 태그 (e.g., ["electronics", "accessory"])
}

// Response
{
  "inquiryId": string;
  "status": "new";
  "createdAt": timestamp;
  "clientId": string;                 // 자동 생성 또는 매칭
  "parsedRequestId"?: string;         // 정규화 엔진 실행 후 생성
}
```

#### GET /api/inquiries
**문의 목록 조회**

```typescript
// Query Parameters
{
  "firmId": string;           // 필터
  "status"?: InquiryStatus;   // 필터 (new, parsed, candidate_ready, searched, reviewed)
  "ownerUserId"?: string;     // 필터
  "page": number;             // 기본값: 1
  "limit": number;            // 기본값: 20
  "sortBy"?: "createdAt" | "updatedAt";
  "sortOrder"?: "asc" | "desc";
}

// Response
{
  "items": Inquiry[];
  "total": number;
  "page": number;
  "limit": number;
}
```

#### GET /api/inquiries/[id]
**특정 문의 조회 (전체 워크플로우 포함)**

```typescript
// Response
{
  inquiry: Inquiry;
  parsedRequest?: ParsedRequest;          // 정규화 데이터
  candidateRun?: CandidateRun;            // 후보 생성 결과
  goodsCandidates?: GoodsCandidate[];     // 추천 상품/류
  searchJob?: SearchJob;                  // 검색 작업
  searchResults?: SearchResult[];         // 검색 결과
  reviewReport?: ReviewReport;            // 검토 리포트
  caseDraft?: CaseDraft;                  // 사건 초안
}
```

#### PATCH /api/inquiries/[id]
**문의 상태 업데이트**

```typescript
{
  "status"?: InquiryStatus;
  "ownerUserId"?: string;
  "metadata"?: Record<string, any>;
}
```

---

### 1.2 [정규화 엔진] - ParsedRequest Generation

#### POST /api/inquiries/[id]/parse
**자동 정규화 (LLM 기반)**

```typescript
// Request (body는 비어있음, inquiryId 사용)

// Response
{
  "parsedRequestId": string;
  "markNameNormalized": string;           // "스마트폰 액세서리" → "smartphone accessory"
  "goodsDescriptionNormalized": string;   // 정규화된 상품 설명
  "industry": string;                     // 추론된 업종 (e.g., "electronics")
  "suggestedClassNo"?: number;            // 추천 류 (예비)
  "confidence": number;                   // 0~1, 신뢰도
  "missingFields"?: string[];             // 필요한 추가 정보
  "rawParsedData": Record<string, any>;   // 원본 LLM 응답
}
```

---

### 1.3 [지정상품 설계 엔진] - Candidate Generation

#### POST /api/candidates/generate
**상품류/지정상품 후보 생성**

```typescript
// Request
{
  "inquiryId": string;
  "markNameNormalized": string;
  "goodsDescriptionNormalized": string;
  "industry"?: string;
  "manualClassNo"?: number;               // 사용자가 직접 지정 (선택)
}

// Response
{
  "candidateRunId": string;
  "state": "running" | "done" | "failed";
  "candidates": [
    {
      "candidateId": string;
      "term": string;                     // "스마트폰 홀더"
      "classNo": number;                  // 9
      "sourceType": "official_notice_name" | "ai_generated" | "competitor_reference";
      "confidence": number;               // 0~1
      "rationale": string;                // "스마트폰 액세서리는 일반적으로 класс 9에 분류"
      "isSelected": boolean;              // 초기값: false
      "similarityGroups": string[];       // ["01-01", "01-02"]
    }
  ];
  "totalCount": number;
}
```

#### GET /api/candidates?candidateRunId=xxx
**후보 목록 조회**

#### PATCH /api/candidates/[id]/toggle
**후보 선택 토글**

```typescript
// Request
{
  "isSelected": boolean;
}

// Response
{
  "candidateId": string;
  "isSelected": boolean;
}
```

---

### 1.4 [검색 보조 엔진] - Search Execution

#### POST /api/search-jobs
**유사상표 검색 시작**

```typescript
// Request
{
  "inquiryId": string;
  "candidateRunId": string;               // 선택한 후보들을 기반으로 검색
  "searchMode": "exact_mark" | "mark_keyword" | "similarity_group";
  "customSearchParams"?: {
    "additionalKeywords"?: string[];      // 사용자가 추가하려는 키워드
    "excludeTerms"?: string[];
  }
}

// Response
{
  "searchJobId": string;
  "state": "queued";
  "candidateCount": number;               // 검색할 후보 개수
  "estimatedTime": number;                // 예상 시간 (초)
}
```

#### GET /api/search-jobs/[id]/status
**검색 진행상황**

```typescript
// Response
{
  "searchJobId": string;
  "state": "queued" | "running" | "done" | "failed";
  "progress": {
    "completed": number;
    "total": number;
    "percentage": number;
  };
  "resultCount": number;
  "completedAt"?: timestamp;
}
```

#### GET /api/search-results?searchJobId=xxx
**검색 결과 조회**

```typescript
// Query
{
  "searchJobId": string;
  "sortBy"?: "relevanceScore" | "createdAt";
  "filterByShortlisted"?: boolean;        // true면 isShortlisted=true인 것만
  "page"?: number;
  "limit"?: number;
}

// Response
{
  "items": [
    {
      "resultId": string;
      "markName": string;                 // "Apple iPhone Holder"
      "applicationNumber": string;        // "30-2023-001234"
      "registerNumber"?: string;
      "applicantName": string;            // "Apple Inc."
      "classNo": number;
      "designatedGoodsSummary": string;
      "statusLabel": string;              // "등록", "거절", "출원중" 등
      "sampleImageUrl"?: string;
      "relevanceScore": number;           // 0~1, LLM 계산
      "isShortlisted": boolean;           // 사용자가 검토 대상으로 지정
      "rawData": Record<string, any>;     // KIPRIS 원본 데이터
    }
  ];
  "total": number;
  "page": number;
}
```

#### PATCH /api/search-results/[id]/toggle-shortlist
**검색 결과 북마크**

```typescript
{
  "isShortlisted": boolean;
}
```

---

### 1.5 [검토 워크벤치] - Review Report

#### POST /api/review-reports
**검토 리포트 생성 (LLM 기반)**

```typescript
// Request
{
  "inquiryId": string;
  "candidateRunId": string;
  "searchJobId": string;
  "shortlistedResultIds": string[];     // 북마크된 결과들만 사용
  "additionalNotes"?: string;            // 사용자 추가 의견
}

// Response
{
  "reportId": string;
  "summary": string;                      // 검토 요약 (200자)
  "riskNote": string;                     // 위험도 평가
  "recommendation": string;               // 출원 가능성 평가
  "clientReplyDraft": string;             // 고객 회신 초안
  "internalNote": string;                 // 내부 메모
  "evidences": [
    {
      "searchResultId": string;
      "note": string;                     // 해당 결과에 대한 코멘트
    }
  ];
}
```

#### PATCH /api/review-reports/[id]
**리포트 수정**

```typescript
{
  "riskNote"?: string;
  "recommendation"?: string;
  "clientReplyDraft"?: string;
  "internalNote"?: string;
}
```

#### POST /api/review-reports/[id]/approve
**리포트 승인**

```typescript
// Response
{
  "reportId": string;
  "approvedAt": timestamp;
  "approvedByUserId": string;
}
```

---

### 1.6 [산출물] - Case Draft & Exports

#### POST /api/case-drafts
**사건 초안 생성**

```typescript
// Request
{
  "inquiryId": string;
  "reviewReportId": string;
}

// Response
{
  "draftId": string;
  "draftJson": {
    "caseNumber": string;               // "2024-001-TRADEMARK" (자동 생성)
    "clientInfo": {
      "name": string;
      "companyName"?: string;
      "email": string;
    };
    "trademarkInfo": {
      "markName": string;
      "designatedGoods": string[];
      "classNo": number[];
      "similarityGroups": string[];
    };
    "reviewSummary": string;
    "riskAssessment": {
      "overallRisk": "low" | "medium" | "high";
      "conflictingMarks": string[];      // 검색 결과에서 유사한 것들
      "rationale": string;
    };
    "recommendation": string;
    "nextSteps": string[];               // 다음 단계 (e.g., ["상세 검토", "출원 진행", "고객 회의"])
  };
  "createdAt": timestamp;
}
```

#### GET /api/case-drafts/[id]
**초안 조회**

#### POST /api/case-drafts/[id]/export
**형식별 내보내기**

```typescript
// Request
{
  "format": "clipboard" | "json" | "csv";
  "includeEvidence"?: boolean;
}

// Response
{
  "url": string;                        // 다운로드 URL (CSV/JSON)
  // 또는 clipboard에 자동 복사 (clipboard 형식)
  "message": string;
}
```

---

## 2. 데이터 모델 상세화

### 2.1 추가/수정 필요 필드

#### Inquiry (추가)
```prisma
model Inquiry {
  // ... 기존 필드
  
  // 추가
  clientName          String?
  companyName         String?
  tags                String[]        @default([])  // JSON 배열
  attachmentCount     Int             @default(0)
  estimatedStep       String?         // "parsing" | "candidate" | "search" | "review"
}
```

#### ParsedRequest (추가)
```prisma
model ParsedRequest {
  // ... 기존 필드
  
  // 추가
  industry            String?         // "electronics", "fashion" 등
  suggestedClassNo    Int?
  rawLlmResponse      Json?           // 전체 LLM 응답 저장 (디버깅용)
}
```

#### CandidateRun (추가)
```prisma
model CandidateRun {
  // ... 기존 필드
  
  // 추가
  totalCandidates     Int
  selectedCount       Int             @default(0)
}
```

#### SearchResult (추가)
```prisma
model SearchResult {
  // ... 기존 필드
  
  // 추가
  relevanceScore      Float?          // LLM이 계산한 유사도
  matchReason         String? @db.Text // "상표명 동일", "발음 유사" 등
  riskLevel           String?         // "high" | "medium" | "low"
}
```

#### ReviewReport (추가)
```prisma
model ReviewReport {
  // ... 기존 필드
  
  // 추가
  riskLevel           String          @default("medium")  // "high" | "medium" | "low"
  evidenceCount       Int             @default(0)
  approvalStatus      String          @default("pending")  // "pending" | "approved" | "rejected"
}
```

#### CaseDraft (수정)
```prisma
model CaseDraft {
  // ... 기존 필드
  
  // 추가
  caseNumber          String          @unique   // "2024-001-TRADEMARK"
  status              String          @default("draft")  // "draft" | "finalized" | "exported"
  exportCount         Int             @default(0)
  lastExportedAt      DateTime?
}
```

---

## 3. LLM 프롬프트 설계

### 3.1 [정규화 엔진] ParseInquiry 프롬프트

**목표**: 비정형 문의를 구조화된 데이터로 변환

```
System:
당신은 변리사 사무소의 상표 검토 보조 AI입니다.
고객의 비정형 문의를 읽고 다음을 추출합니다:
1. 정규화된 상표명 (영문)
2. 정규화된 상품/서비스 설명
3. 추론된 업종/산업
4. 신뢰도 (0~1)
5. 누락된 정보가 있으면 목록화

JSON 형식으로 응답하세요.

User:
{inquiry.title}

{inquiry.rawText}

제목: {inquiry.proposedMarkName}

---
Expected Output:
{
  "markNameNormalized": "smartphone case holder",
  "goodsDescriptionNormalized": "Cases, stands, and holders for smartphone devices, electronic accessories for portable electronic devices",
  "industry": "electronics",
  "confidence": 0.92,
  "missingFields": ["specific target market", "price range"],
  "reasoning": "The inquiry clearly indicates a smartphone accessories business..."
}
```

### 3.2 [지정상품 설계] GenerateCandidates 프롬프트

**목표**: 상품명 → 류(Class), 지정상품, 유사군 추천

```
System:
당신은 상표 검토 전문가입니다.
주어진 상품명과 설명을 바탕으로 다음을 생성합니다:

1. 정확한 상표 류 (1~45)
2. 고시명칭과 일치하는 지정상품
3. 유사군 코드 (국제분류 기준)
4. 유사 상품 사례 (경쟁사 출원 참조)
5. 신규 표현이 필요한 경우 초안

JSON 배열 형식으로, 상위 3개 후보를 신뢰도 순서로 응답.

User:
상표명: {markNameNormalized}
상품설명: {goodsDescriptionNormalized}
업종: {industry}

---
Expected Output:
[
  {
    "term": "smartphone stands and holders",
    "classNo": 9,
    "sourceType": "official_notice_name",
    "confidence": 0.95,
    "rationale": "구 9에는 전자기기 액세서리가 분류됨. 고시명칭 매칭율 95%",
    "similarityGroups": ["01-01", "01-02"],
    "relatedMarks": ["APPLE STAND", "SAMSUNG HOLDER"]
  },
  {
    "term": "mobile phone cases",
    "classNo": 9,
    "sourceType": "official_notice_name",
    "confidence": 0.88,
    ...
  }
]
```

### 3.3 [검색 보조] GenerateSearchQueries 프롬프트

**목표**: 상품명 → 검색식 자동 생성

```
System:
당신은 KIPRIS 검색 최적화 전문가입니다.
상품명을 입력받으면 다음을 생성합니다:

1. 정확 검색식 (mark name exact match)
2. 변형어 검색식 (음차용어, 약자, 발음 유사)
3. 관련 키워드 검색
4. 유사군 기반 검색

각각에 대해 KIPRIS 검색 명령어 형식으로 응답.

User:
상표명: {markName}
류: {classNo}
유사군: {similarityGroups}

---
Expected Output:
{
  "exactMatch": "apple smartphone stand",
  "phoneticalVariations": ["appel smartphone stand", "apple smartphone holder"],
  "keywordSearch": ["smartphone", "stand", "holder", "mobile", "accessories"],
  "similarityGroupSearch": "01-01 01-02"
}
```

### 3.4 [검토 워크벤치] AnalyzeRisk 프롬프트

**목표**: 검색 결과 → 위험도 평가 & 회신 초안

```
System:
당신은 상표 검토 판사입니다.
검색 결과를 분석하여 다음을 판정합니다:

1. 전체 위험도 (high/medium/low)
2. 충돌 가능 상표 (구체적 근거 제시)
3. 출원 가능성 평가
4. 고객 회신 초안 (전문적이면서도 이해하기 쉽게)
5. 추가 검토 필요사항

Markdown 형식으로 응답.

User:
검토 대상 상표: {markName} (Class {classNo})

검색 결과 (유사도 순):
{searchResults.map(r => `- ${r.markName} (${r.applicantName}, 유사도 ${r.relevanceScore})`).join('\n')}

---
Expected Output:
## 위험도 평가
**전체 위험도**: MEDIUM

## 충돌 분석
1. "Apple iPhone Stand" (Apple Inc.)
   - 유사도: 0.92 (상표명 동일, 상품 동일)
   - 위험도: HIGH (선등록 상표)

2. "Samsung Phone Holder" (Samsung Electronics)
   - 유사도: 0.78 (기술 유사)
   - 위험도: MEDIUM

## 출원 가능성
- 현재 형태로는 Apple과의 충돌 가능성 높음
- 상품명 변경 또는 차별화 표현 권장

## 고객 회신
"안녕하세요,

검토 결과를 요약하면 다음과 같습니다:
1. 현재 제안하신 상표 '○○○'는 Class 9에서 등록 가능성이 있으나,
2. 기존 등록 상표 'Apple', 'Samsung' 등과의 충돌 위험이 있습니다.
3. 상품명 구체화 또는 표현 변경을 권장합니다.

자세한 내용은 별도 미팅에서 설명드리겠습니다."

## 추가 검토 필요사항
- [ ] 해외(미국, EU) 검색 필요
- [ ] 경쟁사 출원 동향 모니터링
- [ ] 고객과 상품명 재협의
```

---

## 4. KIPRIS 어댑터 구현 스펙

### 4.1 TrademarkSearchPort 인터페이스 (기존)

```typescript
// packages/domain/src/ports/trademark-search.port.ts

export interface SearchRequest {
  sourceSystem: "kipris" | "mock" | "python_sidecar";
  mode: "exact_mark" | "mark_keyword" | "designated_goods" | "class_no" | "similarity_group";
  params: {
    markName?: string;
    classNo?: number;
    similarityGroup?: string;
    keywords?: string[];
  };
}

export interface SearchResult {
  markName: string;
  applicationNumber?: string;
  registerNumber?: string;
  applicantName?: string;
  classNo?: number;
  designatedGoodsSummary?: string;
  statusLabel?: string;                // "등록", "거절", "출원중", "포기"
  sampleImageUrl?: string;
  relevanceScore?: number;             // LLM이 계산하는 유사도 (0~1)
  rawResponse: any;                    // KIPRIS 원본
}
```

### 4.2 KIPRISAdapter 구현 (packages/kipris-client)

```typescript
// packages/kipris-client/src/kipris-adapter.ts

export class KIPRISAdapter implements ITrademarkSearchPort {
  private client: KIPRISClient;  // mcp_kipris 또는 공식 KIPRIS API SDK
  
  async search(request: SearchRequest): Promise<SearchResult[]> {
    // 1. 검색식 생성
    const queryString = this.buildKIPRISQuery(request);
    
    // 2. KIPRIS API 호출
    const rawResults = await this.client.search(queryString, {
      limit: 50,
      timeout: 30000,
      cache: true,  // 캐싱 활성화
    });
    
    // 3. 결과 정규화
    return rawResults.map(raw => this.normalizeResult(raw));
    
    // 4. 유사도 계산 (LLM 없이 규칙 기반)
    // - 상표명 동일: 0.9~1.0
    // - 상표명 유사 (발음, 자모): 0.7~0.9
    // - 상품 동일: 0.6~0.8
  }
  
  private buildKIPRISQuery(request: SearchRequest): string {
    switch (request.mode) {
      case "exact_mark":
        return `SELECT * FROM TM WHERE mark_name = '${request.params.markName}'`;
      case "mark_keyword":
        return `SELECT * FROM TM WHERE mark_name LIKE '%${request.params.keywords?.join('%')}%'`;
      case "class_no":
        return `SELECT * FROM TM WHERE class_no = ${request.params.classNo}`;
      // ... 다른 모드
    }
  }
  
  private normalizeResult(raw: any): SearchResult {
    return {
      markName: raw.markName,
      applicantName: raw.applicantName,
      classNo: parseInt(raw.classNo),
      designatedGoodsSummary: raw.designatedGoods,
      statusLabel: this.mapStatus(raw.status),
      sampleImageUrl: raw.imageUrl,
      relevanceScore: this.calculateRelevance(raw),
      rawResponse: raw,
    };
  }
}
```

### 4.3 LLM 기반 유사도 계산 (packages/llm-engine)

```typescript
// packages/llm-engine/src/relevance-calculator.ts

export class RelevanceCalculator {
  constructor(private llmPort: ILLMPort) {}
  
  async calculateRelevance(
    targetMark: string,
    searchResult: SearchResult,
    classNo: number
  ): Promise<number> {
    // LLM을 사용한 정교한 유사도 계산
    const analysis = await this.llmPort.analyzeMarkSimilarity({
      targetMark,
      candidateMark: searchResult.markName,
      targetClass: classNo,
      candidateClass: searchResult.classNo,
      targetGoods: "smartphoneAccessories",
      candidateGoods: searchResult.designatedGoodsSummary,
    });
    
    return analysis.similarityScore; // 0~1
  }
}
```

---

## 5. 웹 UI 컴포넌트 구조

### 5.1 페이지 레이아웃

```
/inquiries
  ├─ [InquiriesList]  # 접수함 목록
  │   └─ [NewInquiryButton]
  │
  └─ /[id]
      └─ [InquiryDetailView]
          ├─ [InboxPanel]           # [접수함]
          ├─ [NormalizationPanel]    # [정규화]
          ├─ [CandidatePanel]        # [지정상품]
          ├─ [SearchPanel]           # [검색]
          ├─ [ReviewPanel]           # [검토]
          └─ [ExportPanel]           # [산출물]
```

### 5.2 주요 컴포넌트

#### [InquiriesList]
```
┌─────────────────────────────────────────┐
│ 상표 검토 접수함                         │ [+ 새로 등록]
├─────────────────────────────────────────┤
│ 제목          | 고객명  | 상태  | 수정일 │
├─────────────────────────────────────────┤
│ 스마트폰 홀더 | 김○○  | 검토중 | 2024-04-02 │
│ 가방 디자인   | 이○○  | 완료 | 2024-04-01 │
└─────────────────────────────────────────┘
```

#### [InboxPanel] - 신규 입력
```
┌────────────────────────────────┐
│ 📥 접수함                       │
├────────────────────────────────┤
│ 제목: [___________]             │
│ 고객명: [___________]           │
│ 회사: [___________]             │
│ 이메일: [___________]           │
│                                │
│ 상품/서비스 설명:               │
│ [________________________]      │
│ [________________________]      │
│                                │
│ 첨부: [📎 파일 선택]            │
│                                │
│ [초기화]  [✓ 접수]             │
└────────────────────────────────┘
```

#### [CandidatePanel] - 지정상품 설계
```
┌──────────────────────────────────────┐
│ 🔍 지정상품 설계                      │
├──────────────────────────────────────┤
│ 상표명: smartphone case holder       │
│ 추천 류: 9 (유사도: 95%)             │
├──────────────────────────────────────┤
│ 후보 (유사도 순):                     │
│                                      │
│ ☐ smartphone stands and holders      │
│   Class 9 | 고시명칭 | 신뢰도: 95%   │
│   유사군: 01-01, 01-02               │
│                                      │
│ ☐ mobile phone cases                 │
│   Class 9 | 고시명칭 | 신뢰도: 88%   │
│                                      │
│ [🔄 다시 생성]  [✓ 검색으로]        │
└──────────────────────────────────────┘
```

#### [SearchPanel] - 검색 결과
```
┌──────────────────────────────────────────────┐
│ 🔎 유사상표 검색                              │
├──────────────────────────────────────────────┤
│ 검색식: smartphone class:9 similarity:01-01  │
│ 상태: [████████░░] 80% (12/15)               │
├──────────────────────────────────────────────┤
│ 결과 (유사도 순):                             │
│                                              │
│ ☐ Apple iPhone Stand                         │
│   • 출원인: Apple Inc.                       │
│   • 상태: 등록                               │
│   • 유사도: 0.92 ⚠️ HIGH RISK                │
│   📷 [이미지]                                │
│                                              │
│ ☐ Samsung Phone Holder                       │
│   • 출원인: Samsung Electronics               │
│   • 상태: 출원중                             │
│   • 유사도: 0.78 ⚠️ MEDIUM RISK              │
│                                              │
│ [📥 북마크 전체]  [✓ 검토]                   │
└──────────────────────────────────────────────┘
```

#### [ReviewPanel] - 검토 리포트
```
┌─────────────────────────────────────┐
│ 📋 검토 리포트                       │
├─────────────────────────────────────┤
│ 위험도: 🟠 MEDIUM                    │
│                                     │
│ 충돌 분석:                          │
│ • Apple iPhone Stand (위험도: HIGH) │
│ • Samsung Phone Holder (중간)       │
│                                     │
│ 출원 가능성: 조건부 가능             │
│ - 상품명 구체화 필요                 │
│ - 발음/외형적 차별화 필요            │
│                                     │
│ 고객 회신 초안:                     │
│ [________________________________] │
│ [________________________________] │
│                                     │
│ [✎️ 수정]  [✓ 승인]  [❌ 거절]     │
└─────────────────────────────────────┘
```

#### [ExportPanel] - 산출물
```
┌─────────────────────────────────────┐
│ 📤 산출물                            │
├─────────────────────────────────────┤
│ 사건번호: 2024-001-TRADEMARK        │
│                                     │
│ 📄 생성된 초안:                     │
│ • 고객 회신서                       │
│ • 내부 검토 의견                     │
│ • 사건 기록 (JSON)                  │
│                                     │
│ 다운로드/내보내기:                  │
│ [복사]  [💾 JSON]  [📊 CSV]        │
│                                     │
│ ✓ 초안 완성 (2024-04-02 15:30)    │
└─────────────────────────────────────┘
```

---

## 6. 워크플로우 상세 로직

### 6.1 상태 전이 다이어그램

```
[new] 
  ↓ (사용자 입력)
[parsed] (정규화 완료)
  ↓ (후보 선택)
[candidate_ready] (지정상품 완료)
  ↓ (검색 시작)
[searched] (검색 결과 북마크)
  ↓ (리포트 생성)
[reviewed] (검토 완료)
  ↓ (승인)
[approved] (승인됨)
  ↓ (내보내기)
[exported] (초안 내보내기 완료)
```

### 6.2 각 단계별 로직

#### 1️⃣ [접수함] → [정규화]
```typescript
async POST /api/inquiries/[id]/parse {
  // 1. 기존 Inquiry 조회
  const inquiry = await inquiryRepo.findById(id);
  
  // 2. LLM 호출 (정규화)
  const parsedData = await llmPort.parseInquiry({
    title: inquiry.title,
    rawText: inquiry.rawText,
    proposedMarkName: inquiry.proposedMarkName,
  });
  
  // 3. ParsedRequest 저장
  const parsed = await prisma.parsedRequest.create({
    data: {
      inquiryId: id,
      markNameNormalized: parsedData.markNameNormalized,
      goodsDescriptionNormalized: parsedData.goodsDescriptionNormalized,
      industry: parsedData.industry,
      confidence: parsedData.confidence,
      missingFields: parsedData.missingFields,
      parsedJson: parsedData,
      isCurrent: true,
    },
  });
  
  // 4. Inquiry 상태 업데이트
  await inquiryRepo.update(id, { status: "parsed" });
  
  return parsed;
}
```

#### 2️⃣ [정규화] → [지정상품 설계]
```typescript
async POST /api/candidates/generate {
  // 1. ParsedRequest 조회
  const parsed = await prisma.parsedRequest.findFirst({
    where: { inquiryId, isCurrent: true },
  });
  
  // 2. LLM 호출 (후보 생성)
  const candidates = await llmPort.generateCandidates({
    markNameNormalized: parsed.markNameNormalized,
    goodsDescriptionNormalized: parsed.goodsDescriptionNormalized,
    industry: parsed.industry,
  });
  
  // 3. CandidateRun 생성
  const run = await prisma.candidateRun.create({
    data: {
      inquiryId,
      state: "done",
      runVersion: 1,
      inputSnapshot: {
        markName: parsed.markNameNormalized,
        goods: parsed.goodsDescriptionNormalized,
      },
    },
  });
  
  // 4. GoodsCandidate 저장
  for (const candidate of candidates) {
    await prisma.goodsCandidate.create({
      data: {
        candidateRunId: run.id,
        term: candidate.term,
        classNo: candidate.classNo,
        sourceType: candidate.sourceType,
        confidence: candidate.confidence,
        rationale: candidate.rationale,
      },
    });
  }
  
  // 5. Inquiry 상태 업데이트
  await inquiryRepo.update(inquiryId, { status: "candidate_ready" });
  
  return run;
}
```

#### 3️⃣ [지정상품] → [검색]
```typescript
async POST /api/search-jobs {
  // 1. 선택된 후보 조회
  const selected = await prisma.goodsCandidate.findMany({
    where: {
      candidateRunId: request.candidateRunId,
      isSelected: true,
    },
  });
  
  // 2. SearchJob 생성
  const job = await prisma.searchJob.create({
    data: {
      inquiryId: request.inquiryId,
      candidateRunId: request.candidateRunId,
      state: "queued",
    },
  });
  
  // 3. 배경 작업으로 검색 실행
  // (실제로는 Job Queue에 넣음)
  await executeSearchAsync(job.id, selected);
  
  // 4. 즉시 응답 (진행 중 상태)
  return { searchJobId: job.id, state: "queued" };
}

// 배경 작업
async function executeSearchAsync(jobId: string, candidates: GoodsCandidate[]) {
  // 1. Job 상태를 "running"으로 변경
  await prisma.searchJob.update({
    where: { id: jobId },
    data: { state: "running" },
  });
  
  // 2. 각 후보별 검색 실행
  for (const candidate of candidates) {
    const results = await searchPort.search({
      sourceSystem: "kipris",
      mode: "exact_mark",
      params: {
        markName: candidate.term,
        classNo: candidate.classNo,
      },
    });
    
    // 3. SearchResult 저장
    for (const result of results) {
      await prisma.searchResult.create({
        data: {
          searchJobId: jobId,
          sourceSystem: "kipris",
          markName: result.markName,
          applicationNumber: result.applicationNumber,
          classNo: result.classNo,
          relevanceScore: result.relevanceScore,
          rawXml: result.rawResponse,
        },
      });
    }
  }
  
  // 4. Job 완료
  await prisma.searchJob.update({
    where: { id: jobId },
    data: { state: "done", completedAt: new Date() },
  });
  
  // 5. Inquiry 상태 업데이트
  await inquiryRepo.update(jobId.split('-')[0], { status: "searched" });
}
```

#### 4️⃣ [검색] → [검토]
```typescript
async POST /api/review-reports {
  // 1. 북마크된 결과 조회
  const shortlisted = await prisma.searchResult.findMany({
    where: {
      searchJobId: request.searchJobId,
      isShortlisted: true,
    },
  });
  
  // 2. LLM 호출 (리포트 생성)
  const report = await llmPort.generateReport({
    markName: /* candidate.term */,
    goods: /* parsed.goodsDescription */,
    searchResults: shortlisted.map(r => ({
      markName: r.markName,
      applicantName: r.applicantName,
      relevanceScore: r.relevanceScore,
    })),
  });
  
  // 3. ReviewReport 저장
  const saved = await prisma.reviewReport.create({
    data: {
      inquiryId: request.inquiryId,
      searchJobId: request.searchJobId,
      summary: report.summary,
      riskNote: report.riskNote,
      recommendation: report.recommendation,
      clientReplyDraft: report.clientReplyDraft,
    },
  });
  
  // 4. ReviewEvidence 저장
  for (const result of shortlisted) {
    await prisma.reviewEvidence.create({
      data: {
        reviewReportId: saved.id,
        searchResultId: result.id,
      },
    });
  }
  
  // 5. Inquiry 상태 업데이트
  await inquiryRepo.update(request.inquiryId, { status: "reviewed" });
  
  return saved;
}
```

#### 5️⃣ [검토] → [산출물]
```typescript
async POST /api/case-drafts {
  // 1. ReviewReport 조회
  const report = await prisma.reviewReport.findUnique({
    where: { id: request.reviewReportId },
    include: { evidences: { include: { searchResult: true } } },
  });
  
  // 2. CaseDraft 생성
  const draft = await prisma.caseDraft.create({
    data: {
      inquiryId: request.inquiryId,
      reviewReportId: report.id,
      caseNumber: generateCaseNumber(),
      draftJson: {
        clientInfo: { /* ... */ },
        trademarkInfo: { /* ... */ },
        riskAssessment: {
          overallRisk: parseRiskLevel(report.riskNote),
          conflictingMarks: report.evidences.map(e => e.searchResult.markName),
        },
        clientReplyDraft: report.clientReplyDraft,
      },
    },
  });
  
  // 3. Inquiry 상태 업데이트
  await inquiryRepo.update(request.inquiryId, { 
    status: "approved"  // 또는 사용자가 명시적으로 승인할 때까지 "reviewed"
  });
  
  return draft;
}
```

### 6.3 에러 처리

```typescript
// 모든 엔드포인트에서 공통 에러 처리

export async function handleWorkflowError(
  inquiryId: string,
  step: string,
  error: any
) {
  // 1. 에러 로깅
  logger.error(`Workflow error in ${step}`, {
    inquiryId,
    error: error.message,
    stack: error.stack,
  });
  
  // 2. Inquiry 메타데이터에 기록
  await inquiryRepo.update(inquiryId, {
    metadata: {
      lastError: {
        step,
        message: error.message,
        timestamp: new Date(),
        retry: true,  // 재시도 가능 여부
      },
    },
  });
  
  // 3. 사용자에게 반환 (재시도 가능한지 표시)
  throw new WorkflowError(
    `Failed to ${step}: ${error.message}`,
    { inquiryId, retryable: true }
  );
}
```

---

## 7. 구현 일정

| Phase | 내용 | 기간 | 완료 조건 |
|-------|------|------|---------|
| **1** | 웹 폼 + 정규화 엔진 | 1주 | "상품 입력 → 정규화 완료" 동작 |
| **2** | 지정상품 설계 UI + LLM | 1주 | "후보 생성 → 선택" 동작 |
| **3** | KIPRIS 연동 + 검색 UI | 1주 | "검색 실행 → 결과 표시" 동작 |
| **4** | 검토 워크벤치 + 산출물 | 1주 | "전체 워크플로우 1 사이클 완성" |

---

## 8. 데이터 보안 & 성능

### 8.1 캐싱 전략
- KIPRIS 검색 결과: Redis (TTL: 7일)
- LLM 응답: 데이터베이스 (영구 저장)
- 빈번한 쿼리: DB 인덱스 최적화

### 8.2 Rate Limiting
- KIPRIS API: 월 1,000건 무료 제한 → 캐싱 필수
- Claude API: 토큰 기반 레이트 제한

### 8.3 권한 관리
- 모든 API에 `firmId` 검증
- `ownerUserId`로 담당자 추적
- 감시 로그 기록

---

## 부록: 참고 레포 매핑

| 스펙 섹션 | 참고 레포 | 활용 방식 |
|---------|---------|---------|
| 1. API | - | 자체 설계 |
| 3. LLM 프롬프트 | patent-analysis | 분석/평가 프롬프트 참고 |
| 4. KIPRIS 어댑터 | mcp_kipris | API 호출 구조 + 정규화 |
| 4. 유사도 계산 | langchain_kipris_tools | Tool calling 패턴 |
| 5. 웹 UI | - | 자체 설계 |
| 6. 워크플로우 | drug_patent_tracker | 상태 추적 + 리포트 생성 |
