-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'reviewer', 'operator');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('new', 'parsed', 'candidate_ready', 'searched', 'reviewed', 'approved', 'exported');

-- CreateEnum
CREATE TYPE "InquirySourceChannel" AS ENUM ('manual', 'gmail_forward', 'gmail_api');

-- CreateEnum
CREATE TYPE "InboxProvider" AS ENUM ('gmail', 'outlook');

-- CreateEnum
CREATE TYPE "InboxAuthType" AS ENUM ('oauth', 'app_password', 'manual');

-- CreateEnum
CREATE TYPE "GoodsTermType" AS ENUM ('official_notice_name', 'accepted_similar_name');

-- CreateEnum
CREATE TYPE "CandidateRunState" AS ENUM ('running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "CandidateSourceType" AS ENUM ('official_notice_name', 'accepted_similar_name', 'ai_generated', 'manual', 'competitor_reference');

-- CreateEnum
CREATE TYPE "SearchSourceSystem" AS ENUM ('kipris', 'mock', 'python_sidecar');

-- CreateEnum
CREATE TYPE "SearchMode" AS ENUM ('exact_mark', 'mark_keyword', 'designated_goods', 'class_no', 'similarity_group');

-- CreateEnum
CREATE TYPE "SearchJobState" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('clipboard', 'csv', 'json');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'done', 'failed', 'retrying', 'cancelled');

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'operator',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxAccount" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "provider" "InboxProvider" NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "authType" "InboxAuthType" NOT NULL DEFAULT 'oauth',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "labelFilter" TEXT,
    "lastCursor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationVersion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsTerm" (
    "id" TEXT NOT NULL,
    "classificationVersionId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "classNo" INTEGER NOT NULL,
    "termType" "GoodsTermType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourcePage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsTermSimilarityGroup" (
    "id" TEXT NOT NULL,
    "goodsTermId" TEXT NOT NULL,
    "similarityGroupCode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GoodsTermSimilarityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT,
    "inboxAccountId" TEXT,
    "ownerUserId" TEXT,
    "classificationVersionId" TEXT,
    "sourceChannel" "InquirySourceChannel" NOT NULL DEFAULT 'manual',
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "rawText" TEXT NOT NULL,
    "rawHtml" TEXT,
    "senderEmail" TEXT,
    "proposedMarkName" TEXT,
    "metadata" JSONB,
    "status" "InquiryStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryAttachment" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedRequest" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "parsedJson" JSONB NOT NULL,
    "markNameNormalized" TEXT,
    "goodsDescriptionNormalized" TEXT,
    "industryGuess" TEXT,
    "missingFields" JSONB,
    "confidence" DOUBLE PRECISION,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateRun" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "state" "CandidateRunState" NOT NULL DEFAULT 'running',
    "runVersion" INTEGER NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsCandidate" (
    "id" TEXT NOT NULL,
    "candidateRunId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT,
    "classNo" INTEGER NOT NULL,
    "sourceType" "CandidateSourceType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rationale" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsCandidateSimilarityGroup" (
    "id" TEXT NOT NULL,
    "goodsCandidateId" TEXT NOT NULL,
    "similarityGroupCode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GoodsCandidateSimilarityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchJob" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "candidateRunId" TEXT,
    "createdByUserId" TEXT,
    "state" "SearchJobState" NOT NULL DEFAULT 'queued',
    "queryStrategy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "searchJobId" TEXT NOT NULL,
    "sourceSystem" "SearchSourceSystem" NOT NULL,
    "mode" "SearchMode" NOT NULL,
    "requestParams" JSONB NOT NULL,
    "queryHash" TEXT NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL,
    "searchJobId" TEXT NOT NULL,
    "sourceSystem" "SearchSourceSystem" NOT NULL,
    "mode" "SearchMode" NOT NULL,
    "applicationNumber" TEXT,
    "registerNumber" TEXT,
    "markName" TEXT NOT NULL,
    "applicantName" TEXT,
    "classNo" INTEGER,
    "designatedGoodsSummary" TEXT,
    "statusLabel" TEXT,
    "sampleImageUrl" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "detailJson" JSONB,
    "rawXml" TEXT,
    "isShortlisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchResultSimilarityGroup" (
    "id" TEXT NOT NULL,
    "searchResultId" TEXT NOT NULL,
    "similarityGroupCode" TEXT NOT NULL,

    CONSTRAINT "SearchResultSimilarityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "candidateRunId" TEXT,
    "searchJobId" TEXT,
    "summary" TEXT,
    "riskNote" TEXT,
    "recommendation" TEXT,
    "clientReplyDraft" TEXT,
    "internalNote" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvidence" (
    "id" TEXT NOT NULL,
    "reviewReportId" TEXT NOT NULL,
    "searchResultId" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDraft" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "reviewReportId" TEXT NOT NULL,
    "draftJson" JSONB NOT NULL,
    "exportFormat" "ExportFormat" NOT NULL DEFAULT 'clipboard',
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalApiCache" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalApiCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_firmId_idx" ON "User"("firmId");

-- CreateIndex
CREATE INDEX "Client_firmId_idx" ON "Client"("firmId");

-- CreateIndex
CREATE INDEX "Client_companyName_idx" ON "Client"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "InboxAccount_accountEmail_key" ON "InboxAccount"("accountEmail");

-- CreateIndex
CREATE INDEX "InboxAccount_firmId_idx" ON "InboxAccount"("firmId");

-- CreateIndex
CREATE INDEX "InboxAccount_isActive_idx" ON "InboxAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificationVersion_label_key" ON "ClassificationVersion"("label");

-- CreateIndex
CREATE INDEX "GoodsTerm_classificationVersionId_classNo_idx" ON "GoodsTerm"("classificationVersionId", "classNo");

-- CreateIndex
CREATE INDEX "GoodsTerm_term_idx" ON "GoodsTerm"("term");

-- CreateIndex
CREATE INDEX "GoodsTermSimilarityGroup_goodsTermId_idx" ON "GoodsTermSimilarityGroup"("goodsTermId");

-- CreateIndex
CREATE INDEX "GoodsTermSimilarityGroup_similarityGroupCode_idx" ON "GoodsTermSimilarityGroup"("similarityGroupCode");

-- CreateIndex
CREATE INDEX "Inquiry_firmId_idx" ON "Inquiry"("firmId");

-- CreateIndex
CREATE INDEX "Inquiry_status_updatedAt_idx" ON "Inquiry"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Inquiry_ownerUserId_idx" ON "Inquiry"("ownerUserId");

-- CreateIndex
CREATE INDEX "Inquiry_clientId_idx" ON "Inquiry"("clientId");

-- CreateIndex
CREATE INDEX "InquiryAttachment_inquiryId_idx" ON "InquiryAttachment"("inquiryId");

-- CreateIndex
CREATE INDEX "ParsedRequest_inquiryId_isCurrent_idx" ON "ParsedRequest"("inquiryId", "isCurrent");

-- CreateIndex
CREATE INDEX "CandidateRun_inquiryId_idx" ON "CandidateRun"("inquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateRun_inquiryId_runVersion_key" ON "CandidateRun"("inquiryId", "runVersion");

-- CreateIndex
CREATE INDEX "GoodsCandidate_candidateRunId_idx" ON "GoodsCandidate"("candidateRunId");

-- CreateIndex
CREATE INDEX "GoodsCandidate_classNo_idx" ON "GoodsCandidate"("classNo");

-- CreateIndex
CREATE INDEX "GoodsCandidate_isSelected_idx" ON "GoodsCandidate"("isSelected");

-- CreateIndex
CREATE INDEX "GoodsCandidateSimilarityGroup_goodsCandidateId_idx" ON "GoodsCandidateSimilarityGroup"("goodsCandidateId");

-- CreateIndex
CREATE INDEX "GoodsCandidateSimilarityGroup_similarityGroupCode_idx" ON "GoodsCandidateSimilarityGroup"("similarityGroupCode");

-- CreateIndex
CREATE INDEX "SearchJob_inquiryId_idx" ON "SearchJob"("inquiryId");

-- CreateIndex
CREATE INDEX "SearchJob_state_idx" ON "SearchJob"("state");

-- CreateIndex
CREATE INDEX "SearchQuery_searchJobId_idx" ON "SearchQuery"("searchJobId");

-- CreateIndex
CREATE INDEX "SearchQuery_queryHash_idx" ON "SearchQuery"("queryHash");

-- CreateIndex
CREATE INDEX "SearchResult_searchJobId_idx" ON "SearchResult"("searchJobId");

-- CreateIndex
CREATE INDEX "SearchResult_applicationNumber_idx" ON "SearchResult"("applicationNumber");

-- CreateIndex
CREATE INDEX "SearchResult_markName_idx" ON "SearchResult"("markName");

-- CreateIndex
CREATE INDEX "SearchResult_classNo_idx" ON "SearchResult"("classNo");

-- CreateIndex
CREATE INDEX "SearchResultSimilarityGroup_searchResultId_idx" ON "SearchResultSimilarityGroup"("searchResultId");

-- CreateIndex
CREATE INDEX "SearchResultSimilarityGroup_similarityGroupCode_idx" ON "SearchResultSimilarityGroup"("similarityGroupCode");

-- CreateIndex
CREATE INDEX "ReviewReport_inquiryId_idx" ON "ReviewReport"("inquiryId");

-- CreateIndex
CREATE INDEX "ReviewEvidence_searchResultId_idx" ON "ReviewEvidence"("searchResultId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewEvidence_reviewReportId_searchResultId_key" ON "ReviewEvidence"("reviewReportId", "searchResultId");

-- CreateIndex
CREATE INDEX "CaseDraft_inquiryId_idx" ON "CaseDraft"("inquiryId");

-- CreateIndex
CREATE INDEX "CaseDraft_reviewReportId_idx" ON "CaseDraft"("reviewReportId");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalApiCache_keyHash_key" ON "ExternalApiCache"("keyHash");

-- CreateIndex
CREATE INDEX "ExternalApiCache_namespace_expiresAt_idx" ON "ExternalApiCache"("namespace", "expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAccount" ADD CONSTRAINT "InboxAccount_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsTerm" ADD CONSTRAINT "GoodsTerm_classificationVersionId_fkey" FOREIGN KEY ("classificationVersionId") REFERENCES "ClassificationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsTermSimilarityGroup" ADD CONSTRAINT "GoodsTermSimilarityGroup_goodsTermId_fkey" FOREIGN KEY ("goodsTermId") REFERENCES "GoodsTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_inboxAccountId_fkey" FOREIGN KEY ("inboxAccountId") REFERENCES "InboxAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_classificationVersionId_fkey" FOREIGN KEY ("classificationVersionId") REFERENCES "ClassificationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryAttachment" ADD CONSTRAINT "InquiryAttachment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedRequest" ADD CONSTRAINT "ParsedRequest_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRun" ADD CONSTRAINT "CandidateRun_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRun" ADD CONSTRAINT "CandidateRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsCandidate" ADD CONSTRAINT "GoodsCandidate_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsCandidateSimilarityGroup" ADD CONSTRAINT "GoodsCandidateSimilarityGroup_goodsCandidateId_fkey" FOREIGN KEY ("goodsCandidateId") REFERENCES "GoodsCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchJob" ADD CONSTRAINT "SearchJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchQuery" ADD CONSTRAINT "SearchQuery_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResultSimilarityGroup" ADD CONSTRAINT "SearchResultSimilarityGroup_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_candidateRunId_fkey" FOREIGN KEY ("candidateRunId") REFERENCES "CandidateRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvidence" ADD CONSTRAINT "ReviewEvidence_reviewReportId_fkey" FOREIGN KEY ("reviewReportId") REFERENCES "ReviewReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvidence" ADD CONSTRAINT "ReviewEvidence_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDraft" ADD CONSTRAINT "CaseDraft_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDraft" ADD CONSTRAINT "CaseDraft_reviewReportId_fkey" FOREIGN KEY ("reviewReportId") REFERENCES "ReviewReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

