# Workflow Documentation

## Overview

InvenSync automates trademark review through a series of coordinated workflows. Each workflow handles a specific stage in the review process and can be executed independently or as part of the complete pipeline.

## Workflow Pipeline

### Complete Pipeline Execution

```
POST /api/inquiries/[id]/process
    ↓
InquiryOrchestrator.processInquiryFull()
    ├─ InquiryParseWorkflow
    ├─ CandidateGenerateWorkflow
    ├─ SearchExecuteWorkflow
    └─ ReportGenerateWorkflow
```

## Detailed Workflows

### 1. InquiryParseWorkflow

**Purpose**: Extract structured data from unstructured inquiry text

**Input**:
- Inquiry ID
- ILLMPort (LLM service)

**Process**:
1. Retrieve inquiry from database
2. Validate inquiry status is `new`
3. Call LLM to parse:
   - Mark name normalization
   - Goods description normalization
   - Industry classification
   - Confidence score
   - Missing fields detection
4. Store parsed request record
5. Update inquiry status to `parsed`

**Output**:
```typescript
{
  inquiry: Inquiry,
  parsedData: ParsedInquiryData,
  markNameNormalized: string,
  goodsDescription: string
}
```

**LLM Prompt** (conceptual):
```
Extract the following from the inquiry:
1. Normalized trademark name (remove special chars, standardize)
2. Standardized goods/services description
3. Industry classification
4. Confidence score (0-1)
5. List of missing required information

Inquiry Title: {title}
Inquiry Text: {rawText}
```

**Error Handling**:
- `ValidationError` if inquiry not found
- `InquiryProcessingError` if mark name/goods missing
- `ExternalServiceError` if LLM fails

---

### 2. CandidateGenerateWorkflow

**Purpose**: Generate trademark classification candidates

**Input**:
- Inquiry ID
- ILLMPort
- Optional run version (defaults to 1)

**Process**:
1. Retrieve inquiry with status `parsed`
2. Get current ParsedRequest
3. Create CandidateRun record (state: running)
4. Call LLM to generate candidates:
   - Create 8 candidates per inquiry
   - Include official classifications
   - Include AI-suggested classifications
   - Include competitor references (optional)
5. Store GoodsCandidate records
6. Update CandidateRun status to `done`
7. Update inquiry status to `candidate_ready`

**Output**:
```typescript
{
  candidateRunId: string,
  generatedCandidates: GeneratedCandidate[],
  totalCount: number
}
```

**Candidate Structure**:
```typescript
{
  term: "Pet feeding dishes",        // Candidate term
  normalizedTerm: "PET_FEEDING_DISHES",  // Normalized
  classNo: 21,                        // Classification number
  sourceType: "ai_generated",         // How generated
  confidence: 0.92,                   // 0-1 score
  rationale: "Related to pet food..."  // Why selected
}
```

**LLM Prompt** (conceptual):
```
Generate 8 trademark classification candidates for:
- Mark Name: {markName}
- Goods/Services: {goods}
- Industry: {industry}

Return JSON array of candidates with:
- term: suggested goods description
- classNo: NICE class (1-45)
- sourceType: one of [official_notice_name, accepted_similar_name, ai_generated, manual, competitor_reference]
- confidence: 0-1 score
- rationale: why this classification is relevant
```

---

### 3. SearchExecuteWorkflow

**Purpose**: Query trademark database and retrieve similar marks

**Input**:
- Search Job ID
- ITrademarkSearchPort
- Optional candidate IDs (otherwise uses selected from run)

**Process**:
1. Retrieve search job with state `queued`
2. Update to state `running`
3. For each selected candidate:
   - Execute exact mark search in KIPRIS
   - Optionally execute similarity group search
4. Store SearchResult records
5. Calculate relevance scores
6. Update search job to state `done` with completedAt
7. Update inquiry status to `searched`

**Output**:
```typescript
{
  searchJobId: string,
  results: SearchResult[],
  totalCount: number,
  executionTimeMs: number
}
```

**Search Parameters**:
```typescript
{
  sourceSystem: "kipris",        // Search engine
  mode: "exact_mark",            // Search type
  params: {
    markName: "PETBOWL",
    classNo: 21
  }
}
```

**SearchResult Structure**:
```typescript
{
  markName: "PET BOWL",
  applicationNumber: "40-2024-123456",
  registerNumber: "01234567",
  applicantName: "Pet Products Inc.",
  classNo: 21,
  statusLabel: "REGISTERED",
  relevanceScore: 0.87,
  designatedGoodsSummary: "Pet feeding dishes..."
}
```

---

### 4. ReportGenerateWorkflow

**Purpose**: Generate review analysis and recommendations

**Input**:
- Inquiry ID
- Search Job ID
- ILLMPort
- Optional manual notes

**Process**:
1. Retrieve inquiry with status `searched`
2. Get search results for the job
3. Call LLM to analyze:
   - Mark conflict risk assessment
   - Recommendation (proceed/revise/refuse)
   - Client reply draft
   - Risk level determination
4. Create ReviewReport record
5. Create ReviewEvidence records for top 5 results
6. Update inquiry status to `reviewed`
7. Report ready for human approval

**Output**:
```typescript
{
  reviewReportId: string,
  reviewReport: ReviewReport
}
```

**Report Content**:
```typescript
{
  summary: "3 similar marks found with moderate conflict risk",
  riskNote: "Mark 'PET BOWL' registered in same class by competitor",
  recommendation: "Recommend revising to 'PETBOWL CARE' to reduce risk",
  clientReplyDraft: "Thank you for your inquiry...",
  internalNote: "High-priority client, recommend personal call"
}
```

**LLM Prompt** (conceptual):
```
Analyze trademark search results and provide review report:

Proposed Mark: {markName}
Goods/Services: {goods}
Similar Marks Found: {count}

Analysis required:
1. Summary of findings (1-2 sentences)
2. Risk assessment (low/medium/high)
3. Risk notes (specific conflicts)
4. Recommendation (proceed/revise/refuse)
5. Client reply draft (friendly professional tone)

Return JSON with these fields.
```

---

## Workflow Coordination

### Sequential Execution

```typescript
const orchestrator = new InquiryOrchestrator();
const result = await orchestrator.processInquiryFull(
  inquiryId,
  llmPort,
  searchPort
);

// Returns InquiryProcessingPipeline
{
  inquiry: Inquiry,              // Final status
  status: "completed",           // Pipeline status
  result: ReportGenerateResult,  // Final output
  error?: Error                  // If failed
}
```

### Error Recovery

If any workflow fails:

1. Inquiry status remains at last successful stage
2. User can retry from current status
3. CandidateRun/SearchJob marked as `failed`
4. Error details logged for analysis

**Resume from Parsed**:
```typescript
const result = await orchestrator.resumeFromParsed(
  inquiryId,
  llmPort,
  searchPort
);
```

---

## Approval Workflow

After ReportGenerateWorkflow completes:

1. **Human Review Phase**
   - Reviewer examines report
   - Can edit content (summary, risk note, recommendation)
   - Can add internal notes

2. **Approval**
   ```
   POST /api/review-reports/[id]?action=approve
   {
     "approvedByUserId": "user-123"
   }
   ```
   - Sets `approvedByUserId` and `approvedAt` timestamp
   - Inquiry status updated to `approved`

3. **Client Delivery**
   - Client reply draft extracted
   - Document exported for delivery
   - Audit trail recorded

---

## Data Persistence

### Key Records Created

| Workflow | Record Type | Count | Details |
|----------|-------------|-------|---------|
| Parse | ParsedRequest | 1 | Parsing output |
| Candidate | CandidateRun | 1 | Generation run |
| Candidate | GoodsCandidate | 8+ | Each candidate |
| Search | SearchJob | 1 | Search execution |
| Search | SearchQuery | 8+ | One per candidate |
| Search | SearchResult | 10-100 | Each similar mark |
| Report | ReviewReport | 1 | Final analysis |
| Report | ReviewEvidence | 5 | Top results |

---

## Performance Characteristics

| Workflow | Duration | Bottleneck | Optimization |
|----------|----------|-----------|--------------|
| Parse | 5-10s | LLM latency | Batch requests |
| Candidate | 8-15s | LLM latency | Cached similar marks |
| Search | 30-60s | API calls | Parallel queries |
| Report | 10-20s | LLM latency | Concurrent analysis |
| **Total** | **2-3 min** | Search phase | Async execution |

---

## Testing Workflows

### Unit Test Example

```typescript
import { InquiryParseWorkflow } from '@ip-review/workflows';

describe('InquiryParseWorkflow', () => {
  it('should parse inquiry successfully', async () => {
    const mockLLM = {
      parseInquiry: async () => ({
        markNameNormalized: 'PETBOWL',
        goodsDescriptionNormalized: 'Pet feeding dishes',
        confidence: 0.95
      })
    };

    const workflow = new InquiryParseWorkflow();
    const result = await workflow.execute({
      inquiryId: 'test-1',
      llmPort: mockLLM
    });

    expect(result.markNameNormalized).toBe('PETBOWL');
  });
});
```

### Integration Test Example

```typescript
describe('Complete Workflow', () => {
  it('should process inquiry end-to-end', async () => {
    const orchestrator = new InquiryOrchestrator();
    const result = await orchestrator.processInquiryFull(
      inquiryId,
      mockLLM,
      mockSearch
    );

    expect(result.status).toBe('completed');
    expect(result.inquiry.status).toBe('approved');
    expect(result.result.reviewReportId).toBeTruthy();
  });
});
```

---

## Monitoring & Observability

### Key Metrics

- Parse accuracy (manual review rate)
- Candidate relevance score distribution
- Search result count distribution
- Report approval rate
- End-to-end processing time

### Error Tracking

- InvalidStateTransitionError - workflow state issues
- ExternalServiceError - LLM/KIPRIS failures
- InquiryProcessingError - domain validation failures

### Audit Trail

All workflow executions logged with:
- User who triggered
- Timestamp
- Input parameters
- Output results
- Any errors encountered
