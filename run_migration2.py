import subprocess, json

TOKEN = "sbp_0e16fd510353b332b738a27385fd860b99a494d1"
PROJECT = "qzijgyfplsmdavyewkqb"

def run_sql(sql, label=""):
    body = json.dumps({"query": sql})
    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}",
        "-X", "POST", f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", body
    ], capture_output=True, text=True)
    out = result.stdout.strip()
    lines = out.rsplit("\n", 1)
    status = lines[-1] if len(lines) > 1 else "?"
    body_out = lines[0] if len(lines) > 1 else out
    if status != "201":
        print(f"  FAIL {label}: HTTP {status} -- {body_out[-200:]}")
    else:
        print(f"  OK {label}")
    return status

statements = [
    # InquiryAttachment
    ('InquiryAttachment CREATE', '''CREATE TABLE IF NOT EXISTS "InquiryAttachment" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL, "fileUrl" TEXT NOT NULL, "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryAttachment_pkey" PRIMARY KEY ("id")
)'''),
    ('InquiryAttachment idx', 'CREATE INDEX IF NOT EXISTS "InquiryAttachment_inquiryId_idx" ON "InquiryAttachment"("inquiryId")'),
    ('InquiryAttachment fk', 'ALTER TABLE "InquiryAttachment" ADD CONSTRAINT "InquiryAttachment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE'),

    # ParsedRequest
    ('ParsedRequest CREATE', '''CREATE TABLE IF NOT EXISTS "ParsedRequest" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "llmProvider" TEXT, "llmModel" TEXT,
    "parsedJson" JSONB NOT NULL, "markNameNormalized" TEXT, "goodsDescriptionNormalized" TEXT,
    "industryGuess" TEXT, "missingFields" JSONB, "confidence" DOUBLE PRECISION,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedRequest_pkey" PRIMARY KEY ("id")
)'''),
    ('ParsedRequest idx', 'CREATE INDEX IF NOT EXISTS "ParsedRequest_inquiryId_isCurrent_idx" ON "ParsedRequest"("inquiryId","isCurrent")'),
    ('ParsedRequest fk', 'ALTER TABLE "ParsedRequest" ADD CONSTRAINT "ParsedRequest_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE'),

    # CandidateRun
    ('CandidateRun CREATE', '''CREATE TABLE IF NOT EXISTS "CandidateRun" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "createdByUserId" TEXT,
    "state" "CandidateRunState" NOT NULL DEFAULT 'running', "runVersion" INTEGER NOT NULL,
    "inputSnapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateRun_pkey" PRIMARY KEY ("id")
)'''),
    ('CandidateRun uniq', 'CREATE UNIQUE INDEX IF NOT EXISTS "CandidateRun_inquiryId_runVersion_key" ON "CandidateRun"("inquiryId","runVersion")'),
    ('CandidateRun idx', 'CREATE INDEX IF NOT EXISTS "CandidateRun_inquiryId_idx" ON "CandidateRun"("inquiryId")'),
    ('CandidateRun fk1', 'ALTER TABLE "CandidateRun" ADD CONSTRAINT "CandidateRun_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE'),
    ('CandidateRun fk2', 'ALTER TABLE "CandidateRun" ADD CONSTRAINT "CandidateRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL'),

    # GoodsCandidate
    ('GoodsCandidate CREATE', '''CREATE TABLE IF NOT EXISTS "GoodsCandidate" (
    "id" TEXT NOT NULL, "candidateRunId" TEXT NOT NULL, "term" TEXT NOT NULL,
    "normalizedTerm" TEXT, "classNo" INTEGER NOT NULL, "sourceType" "CandidateSourceType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0, "rationale" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsCandidate_pkey" PRIMARY KEY ("id")
)'''),
    ('GoodsCandidate idx1', 'CREATE INDEX IF NOT EXISTS "GoodsCandidate_candidateRunId_idx" ON "GoodsCandidate"("candidateRunId")'),
    ('GoodsCandidate idx2', 'CREATE INDEX IF NOT EXISTS "GoodsCandidate_classNo_idx" ON "GoodsCandidate"("classNo")'),
    ('GoodsCandidate fk', 'ALTER TABLE "GoodsCandidate" ADD CONSTRAINT "GoodsCandidate_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE CASCADE'),

    # GoodsCandidateSimilarityGroup
    ('GoodsCandidateSG CREATE', '''CREATE TABLE IF NOT EXISTS "GoodsCandidateSimilarityGroup" (
    "id" TEXT NOT NULL, "goodsCandidateId" TEXT NOT NULL, "similarityGroupCode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GoodsCandidateSimilarityGroup_pkey" PRIMARY KEY ("id")
)'''),
    ('GoodsCandidateSG fk', 'ALTER TABLE "GoodsCandidateSimilarityGroup" ADD CONSTRAINT "GoodsCandidateSimilarityGroup_goodsCandidateId_fkey" FOREIGN KEY ("goodsCandidateId") REFERENCES "GoodsCandidate"("id") ON DELETE CASCADE'),

    # SearchJob
    ('SearchJob CREATE', '''CREATE TABLE IF NOT EXISTS "SearchJob" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "candidateRunId" TEXT, "createdByUserId" TEXT,
    "state" "SearchJobState" NOT NULL DEFAULT 'queued', "queryStrategy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchJob_pkey" PRIMARY KEY ("id")
)'''),
    ('SearchJob idx1', 'CREATE INDEX IF NOT EXISTS "SearchJob_inquiryId_idx" ON "SearchJob"("inquiryId")'),
    ('SearchJob idx2', 'CREATE INDEX IF NOT EXISTS "SearchJob_state_idx" ON "SearchJob"("state")'),
    ('SearchJob fk1', 'ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE'),
    ('SearchJob fk2', 'ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE SET NULL'),
    ('SearchJob fk3', 'ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL'),

    # SearchQuery
    ('SearchQuery CREATE', '''CREATE TABLE IF NOT EXISTS "SearchQuery" (
    "id" TEXT NOT NULL, "searchJobId" TEXT NOT NULL, "sourceSystem" "SearchSourceSystem" NOT NULL,
    "mode" "SearchMode" NOT NULL, "requestParams" JSONB NOT NULL, "queryHash" TEXT NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
)'''),
    ('SearchQuery idx', 'CREATE INDEX IF NOT EXISTS "SearchQuery_searchJobId_idx" ON "SearchQuery"("searchJobId")'),
    ('SearchQuery fk', 'ALTER TABLE "SearchQuery" ADD CONSTRAINT "SearchQuery_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE'),

    # SearchResult
    ('SearchResult CREATE', '''CREATE TABLE IF NOT EXISTS "SearchResult" (
    "id" TEXT NOT NULL, "searchJobId" TEXT NOT NULL, "sourceSystem" "SearchSourceSystem" NOT NULL,
    "mode" "SearchMode" NOT NULL, "applicationNumber" TEXT, "registerNumber" TEXT,
    "markName" TEXT NOT NULL, "applicantName" TEXT, "classNo" INTEGER,
    "designatedGoodsSummary" TEXT, "statusLabel" TEXT, "sampleImageUrl" TEXT,
    "relevanceScore" DOUBLE PRECISION, "detailJson" JSONB, "rawXml" TEXT,
    "isShortlisted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
)'''),
    ('SearchResult idx', 'CREATE INDEX IF NOT EXISTS "SearchResult_searchJobId_idx" ON "SearchResult"("searchJobId")'),
    ('SearchResult fk', 'ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE'),

    # SearchResultSimilarityGroup
    ('SearchResultSG CREATE', '''CREATE TABLE IF NOT EXISTS "SearchResultSimilarityGroup" (
    "id" TEXT NOT NULL, "searchResultId" TEXT NOT NULL, "similarityGroupCode" TEXT NOT NULL,
    CONSTRAINT "SearchResultSimilarityGroup_pkey" PRIMARY KEY ("id")
)'''),
    ('SearchResultSG fk', 'ALTER TABLE "SearchResultSimilarityGroup" ADD CONSTRAINT "SearchResultSimilarityGroup_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id") ON DELETE CASCADE'),

    # ReviewReport
    ('ReviewReport CREATE', '''CREATE TABLE IF NOT EXISTS "ReviewReport" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "candidateRunId" TEXT, "searchJobId" TEXT,
    "summary" TEXT, "riskNote" TEXT, "recommendation" TEXT, "clientReplyDraft" TEXT,
    "internalNote" TEXT, "approvedByUserId" TEXT, "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
)'''),
    ('ReviewReport idx', 'CREATE INDEX IF NOT EXISTS "ReviewReport_inquiryId_idx" ON "ReviewReport"("inquiryId")'),
    ('ReviewReport fk1', 'ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE'),
    ('ReviewReport fk2', 'ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE SET NULL'),
    ('ReviewReport fk3', 'ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE SET NULL'),
    ('ReviewReport fk4', 'ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL'),

    # ReviewEvidence
    ('ReviewEvidence CREATE', '''CREATE TABLE IF NOT EXISTS "ReviewEvidence" (
    "id" TEXT NOT NULL, "reviewReportId" TEXT NOT NULL, "searchResultId" TEXT NOT NULL,
    "note" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewEvidence_pkey" PRIMARY KEY ("id")
)'''),
    ('ReviewEvidence uniq', 'CREATE UNIQUE INDEX IF NOT EXISTS "ReviewEvidence_reviewReportId_searchResultId_key" ON "ReviewEvidence"("reviewReportId","searchResultId")'),
    ('ReviewEvidence fk1', 'ALTER TABLE "ReviewEvidence" ADD CONSTRAINT "ReviewEvidence_reviewReportId_fkey" FOREIGN KEY ("reviewReportId") REFERENCES "ReviewReport"("id") ON DELETE CASCADE'),
    ('ReviewEvidence fk2', 'ALTER TABLE "ReviewEvidence" ADD CONSTRAINT "ReviewEvidence_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id") ON DELETE CASCADE'),

    # CaseDraft
    ('CaseDraft CREATE', '''CREATE TABLE IF NOT EXISTS "CaseDraft" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "reviewReportId" TEXT NOT NULL,
    "draftJson" JSONB NOT NULL, "exportFormat" "ExportFormat" NOT NULL DEFAULT 'clipboard',
    "exportedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseDraft_pkey" PRIMARY KEY ("id")
)'''),
    ('CaseDraft fk1', 'ALTER TABLE "CaseDraft" ADD CONSTRAINT "CaseDraft_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE'),
    ('CaseDraft fk2', 'ALTER TABLE "CaseDraft" ADD CONSTRAINT "CaseDraft_reviewReportId_fkey" FOREIGN KEY ("reviewReportId") REFERENCES "ReviewReport"("id") ON DELETE CASCADE'),
]

print("=== Running migration ===")
for label, sql in statements:
    run_sql(sql, label)

print("\n=== Final table list ===")
run_sql('SELECT tablename FROM pg_tables WHERE schemaname = \'public\' ORDER BY tablename', "Tables")
import subprocess, json
result = subprocess.run([
    "curl", "-s",
    "-X", "POST", f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
    "-H", f"Authorization: Bearer {TOKEN}",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"query": "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"})
], capture_output=True, text=True)
print(result.stdout)
