import subprocess, json

TOKEN = "sbp_0e16fd510353b332b738a27385fd860b99a494d1"
PROJECT = "qzijgyfplsmdavyewkqb"

def run_query(q, label=""):
    body = json.dumps({"query": q})
    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}",
        "-X", "POST", f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", body
    ], capture_output=True, text=True)
    out = result.stdout.strip()
    print(f"{label}: {out[-200:]}")
    return out

run_query("""
CREATE TABLE IF NOT EXISTS "InquiryAttachment" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL, "fileUrl" TEXT NOT NULL, "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "InquiryAttachment_inquiryId_idx" ON "InquiryAttachment"("inquiryId");
DO $$ BEGIN ALTER TABLE "InquiryAttachment" ADD CONSTRAINT "InquiryAttachment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "InquiryAttachment")

run_query("""
CREATE TABLE IF NOT EXISTS "ParsedRequest" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "llmProvider" TEXT, "llmModel" TEXT,
    "parsedJson" JSONB NOT NULL, "markNameNormalized" TEXT, "goodsDescriptionNormalized" TEXT,
    "industryGuess" TEXT, "missingFields" JSONB, "confidence" DOUBLE PRECISION,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ParsedRequest_inquiryId_isCurrent_idx" ON "ParsedRequest"("inquiryId","isCurrent");
DO $$ BEGIN ALTER TABLE "ParsedRequest" ADD CONSTRAINT "ParsedRequest_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "ParsedRequest")

run_query("""
CREATE TABLE IF NOT EXISTS "CandidateRun" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "createdByUserId" TEXT,
    "state" "CandidateRunState" NOT NULL DEFAULT 'running', "runVersion" INTEGER NOT NULL,
    "inputSnapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateRun_inquiryId_runVersion_key" ON "CandidateRun"("inquiryId","runVersion");
CREATE INDEX IF NOT EXISTS "CandidateRun_inquiryId_idx" ON "CandidateRun"("inquiryId");
DO $$ BEGIN ALTER TABLE "CandidateRun" ADD CONSTRAINT "CandidateRun_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "CandidateRun" ADD CONSTRAINT "CandidateRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "CandidateRun")

run_query("""
CREATE TABLE IF NOT EXISTS "GoodsCandidate" (
    "id" TEXT NOT NULL, "candidateRunId" TEXT NOT NULL, "term" TEXT NOT NULL,
    "normalizedTerm" TEXT, "classNo" INTEGER NOT NULL, "sourceType" "CandidateSourceType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0, "rationale" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsCandidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GoodsCandidate_candidateRunId_idx" ON "GoodsCandidate"("candidateRunId");
CREATE INDEX IF NOT EXISTS "GoodsCandidate_classNo_idx" ON "GoodsCandidate"("classNo");
DO $$ BEGIN ALTER TABLE "GoodsCandidate" ADD CONSTRAINT "GoodsCandidate_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "GoodsCandidate")

run_query("""
CREATE TABLE IF NOT EXISTS "GoodsCandidateSimilarityGroup" (
    "id" TEXT NOT NULL, "goodsCandidateId" TEXT NOT NULL, "similarityGroupCode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GoodsCandidateSimilarityGroup_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN ALTER TABLE "GoodsCandidateSimilarityGroup" ADD CONSTRAINT "GoodsCandidateSimilarityGroup_goodsCandidateId_fkey" FOREIGN KEY ("goodsCandidateId") REFERENCES "GoodsCandidate"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "GoodsCandidateSimilarityGroup")

run_query("""
CREATE TABLE IF NOT EXISTS "SearchJob" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "candidateRunId" TEXT, "createdByUserId" TEXT,
    "state" "SearchJobState" NOT NULL DEFAULT 'queued', "queryStrategy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SearchJob_inquiryId_idx" ON "SearchJob"("inquiryId");
CREATE INDEX IF NOT EXISTS "SearchJob_state_idx" ON "SearchJob"("state");
DO $$ BEGIN ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "SearchJob")

run_query("""
CREATE TABLE IF NOT EXISTS "SearchQuery" (
    "id" TEXT NOT NULL, "searchJobId" TEXT NOT NULL, "sourceSystem" "SearchSourceSystem" NOT NULL,
    "mode" "SearchMode" NOT NULL, "requestParams" JSONB NOT NULL, "queryHash" TEXT NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SearchQuery_searchJobId_idx" ON "SearchQuery"("searchJobId");
DO $$ BEGIN ALTER TABLE "SearchQuery" ADD CONSTRAINT "SearchQuery_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "SearchQuery")

run_query("""
CREATE TABLE IF NOT EXISTS "SearchResult" (
    "id" TEXT NOT NULL, "searchJobId" TEXT NOT NULL, "sourceSystem" "SearchSourceSystem" NOT NULL,
    "mode" "SearchMode" NOT NULL, "applicationNumber" TEXT, "registerNumber" TEXT,
    "markName" TEXT NOT NULL, "applicantName" TEXT, "classNo" INTEGER,
    "designatedGoodsSummary" TEXT, "statusLabel" TEXT, "sampleImageUrl" TEXT,
    "relevanceScore" DOUBLE PRECISION, "detailJson" JSONB, "rawXml" TEXT,
    "isShortlisted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SearchResult_searchJobId_idx" ON "SearchResult"("searchJobId");
DO $$ BEGIN ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "SearchResult")

run_query("""
CREATE TABLE IF NOT EXISTS "SearchResultSimilarityGroup" (
    "id" TEXT NOT NULL, "searchResultId" TEXT NOT NULL, "similarityGroupCode" TEXT NOT NULL,
    CONSTRAINT "SearchResultSimilarityGroup_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN ALTER TABLE "SearchResultSimilarityGroup" ADD CONSTRAINT "SearchResultSimilarityGroup_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "SearchResultSimilarityGroup")

run_query("""
CREATE TABLE IF NOT EXISTS "ReviewReport" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "candidateRunId" TEXT, "searchJobId" TEXT,
    "summary" TEXT, "riskNote" TEXT, "recommendation" TEXT, "clientReplyDraft" TEXT,
    "internalNote" TEXT, "approvedByUserId" TEXT, "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReviewReport_inquiryId_idx" ON "ReviewReport"("inquiryId");
DO $$ BEGIN ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "ReviewReport")

run_query("""
CREATE TABLE IF NOT EXISTS "ReviewEvidence" (
    "id" TEXT NOT NULL, "reviewReportId" TEXT NOT NULL, "searchResultId" TEXT NOT NULL,
    "note" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewEvidence_reviewReportId_searchResultId_key" ON "ReviewEvidence"("reviewReportId","searchResultId");
DO $$ BEGIN ALTER TABLE "ReviewEvidence" ADD CONSTRAINT "ReviewEvidence_reviewReportId_fkey" FOREIGN KEY ("reviewReportId") REFERENCES "ReviewReport"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ReviewEvidence" ADD CONSTRAINT "ReviewEvidence_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "ReviewEvidence")

run_query("""
CREATE TABLE IF NOT EXISTS "CaseDraft" (
    "id" TEXT NOT NULL, "inquiryId" TEXT NOT NULL, "reviewReportId" TEXT NOT NULL,
    "draftJson" JSONB NOT NULL, "exportFormat" "ExportFormat" NOT NULL DEFAULT 'clipboard',
    "exportedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseDraft_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN ALTER TABLE "CaseDraft" ADD CONSTRAINT "CaseDraft_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "CaseDraft" ADD CONSTRAINT "CaseDraft_reviewReportId_fkey" FOREIGN KEY ("reviewReportId") REFERENCES "ReviewReport"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
""", "CaseDraft")

run_query("""
CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL, "type" TEXT NOT NULL, "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued', "attempts" INTEGER NOT NULL DEFAULT 0,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT, "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Job_status_runAt_idx" ON "Job"("status","runAt");
""", "Job")

run_query("""
CREATE TABLE IF NOT EXISTS "ExternalApiCache" (
    "id" TEXT NOT NULL, "namespace" TEXT NOT NULL, "keyHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL, "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalApiCache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalApiCache_keyHash_key" ON "ExternalApiCache"("keyHash");
""", "ExternalApiCache")

print("\n=== Checking tables ===")
result = run_query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;", "Tables")
print(result)
