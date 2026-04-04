-- InvenSync Seed Data
-- Run this in Supabase SQL Editor AFTER migration.sql

-- 1. Firm
INSERT INTO "Firm" (id, name, "createdAt", "updatedAt")
VALUES ('firm_demo_001', 'IP Review Desk Demo Firm', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Users
INSERT INTO "User" (id, "firmId", name, email, role, "isActive", "createdAt", "updatedAt")
VALUES
  ('user_admin_001', 'firm_demo_001', '윤인식', 'admin@ipreview.local', 'admin', true, NOW(), NOW()),
  ('user_admin_002', 'firm_demo_001', '상표검토 관리자', 'trademark.inbox26@gmail.com', 'admin', true, NOW(), NOW()),
  ('user_rev_001',   'firm_demo_001', '홍준 변리사', 'reviewer@ipreview.local', 'reviewer', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "isActive" = true;

-- 3. InboxAccount
INSERT INTO "InboxAccount" (id, "firmId", provider, "accountEmail", "authType", "isActive", "labelFilter", "createdAt", "updatedAt")
VALUES ('inbox_001', 'firm_demo_001', 'gmail', 'trademark.inbox26@gmail.com', 'manual', true, 'INBOX', NOW(), NOW())
ON CONFLICT ("accountEmail") DO UPDATE SET "isActive" = true;

-- 4. ClassificationVersion
INSERT INTO "ClassificationVersion" (id, label, "sourceName", "isActive", "createdAt", "updatedAt")
VALUES ('cv_nice_2026', 'NICE-KR-2026-MVP', 'KIPO reference seed', true, NOW(), NOW())
ON CONFLICT (label) DO UPDATE SET "isActive" = true;

-- 5. GoodsTerms (delete & re-insert)
DELETE FROM "GoodsTerm" WHERE "classificationVersionId" = 'cv_nice_2026';

INSERT INTO "GoodsTerm" (id, "classificationVersionId", term, "classNo", "termType", "isActive", "sourcePage", "createdAt", "updatedAt")
VALUES
  ('gt_001', 'cv_nice_2026', '반려동물용 식기', 21, 'official_notice_name', true, 'seed', NOW(), NOW()),
  ('gt_002', 'cv_nice_2026', '반려동물용 자동급식기', 21, 'accepted_similar_name', true, 'seed', NOW(), NOW()),
  ('gt_003', 'cv_nice_2026', '동물용 사료', 31, 'official_notice_name', true, 'seed', NOW(), NOW()),
  ('gt_004', 'cv_nice_2026', '반려동물 간식', 31, 'accepted_similar_name', true, 'seed', NOW(), NOW()),
  ('gt_005', 'cv_nice_2026', '반려동물용품 소매업', 35, 'official_notice_name', true, 'seed', NOW(), NOW()),
  ('gt_006', 'cv_nice_2026', '반려동물 간식 판매대행업', 35, 'accepted_similar_name', true, 'seed', NOW(), NOW()),
  ('gt_007', 'cv_nice_2026', '케겔운동기구', 10, 'official_notice_name', true, 'seed', NOW(), NOW()),
  ('gt_008', 'cv_nice_2026', '의료용 재활운동기구', 10, 'accepted_similar_name', true, 'seed', NOW(), NOW());

INSERT INTO "GoodsTermSimilarityGroup" (id, "goodsTermId", "similarityGroupCode", "isPrimary")
VALUES
  ('gtsg_001', 'gt_001', 'G1810', true),
  ('gtsg_002', 'gt_002', 'G1810', true),
  ('gtsg_003', 'gt_003', 'G1311', true),
  ('gtsg_004', 'gt_004', 'G1311', true),
  ('gtsg_005', 'gt_005', 'S1289', true),
  ('gtsg_006', 'gt_006', 'S1289', true),
  ('gtsg_007', 'gt_007', 'G1201', true),
  ('gtsg_008', 'gt_008', 'G1203', true);

-- 6. Client
INSERT INTO "Client" (id, "firmId", name, "companyName", email, "createdAt", "updatedAt")
VALUES ('client_001', 'firm_demo_001', '김고객', '펫푸드랩 주식회사', 'client@example.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Inquiry 1 (PETBOWL - reviewed status)
INSERT INTO "Inquiry" (id, "firmId", "clientId", "inboxAccountId", "ownerUserId", "classificationVersionId",
  "sourceChannel", title, subject, "senderEmail", "proposedMarkName", "rawText", status, "createdAt", "updatedAt")
VALUES (
  'inq_001', 'firm_demo_001', 'client_001', 'inbox_001', 'user_admin_001', 'cv_nice_2026',
  'gmail_forward', '반려동물 식기 브랜드 검토 요청', '[검토요청] PETBOWL 상표 검토',
  'client@example.com', 'PETBOWL',
  '안녕하세요. 반려동물 식기와 자동급식기 관련 브랜드명을 "PETBOWL"로 생각하고 있습니다. 향후 반려동물 간식 판매 및 온라인 판매 서비스도 검토 중입니다. 상표 검토 요청드립니다.',
  'reviewed', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "ParsedRequest" (id, "inquiryId", "llmProvider", "llmModel", "parsedJson",
  "markNameNormalized", "goodsDescriptionNormalized", "industryGuess", "missingFields", confidence, "isCurrent", "createdAt")
VALUES (
  'pr_001', 'inq_001', 'seed', 'seed-v1',
  '{"markNameCandidates":["PETBOWL"],"goodsDescription":"반려동물용 식기, 자동급식기, 반려동물 간식 판매 및 온라인 판매 서비스","industryGuess":"반려동물 용품 및 유통","competitorHints":[],"missingFields":[],"confidence":0.93}',
  'PETBOWL', '반려동물용 식기, 자동급식기, 반려동물 간식 판매 및 온라인 판매 서비스',
  '반려동물 용품 및 유통', '[]', 0.93, true, NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "CandidateRun" (id, "inquiryId", "createdByUserId", state, "runVersion", "inputSnapshot", "createdAt", "updatedAt")
VALUES ('cr_001', 'inq_001', 'user_admin_001', 'done', 1, '{"parsed":{"goodsDescription":"반려동물용 식기, 자동급식기, 반려동물 간식 판매 및 온라인 판매 서비스"}}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "GoodsCandidate" (id, "candidateRunId", term, "normalizedTerm", "classNo", "sourceType", confidence, rationale, "isSelected", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('gc_001', 'cr_001', '반려동물용 식기', '반려동물용 식기', 21, 'official_notice_name', 0.98, '고시상품명칭과 직접 매칭', true, 1, NOW(), NOW()),
  ('gc_002', 'cr_001', '반려동물용 자동급식기', '반려동물용 자동급식기', 21, 'accepted_similar_name', 0.92, '유사상품 명칭 사전과 매칭', true, 2, NOW(), NOW()),
  ('gc_003', 'cr_001', '반려동물용품 소매업', '반려동물용품 소매업', 35, 'official_notice_name', 0.90, '판매·유통 맥락이 있어 제35류 서비스업 후보 추가', true, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "GoodsCandidateSimilarityGroup" (id, "goodsCandidateId", "similarityGroupCode", "isPrimary")
VALUES
  ('gcsg_001', 'gc_001', 'G1810', true),
  ('gcsg_002', 'gc_002', 'G1810', true),
  ('gcsg_003', 'gc_003', 'S1289', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "SearchJob" (id, "inquiryId", "candidateRunId", "createdByUserId", state, "queryStrategy", "completedAt", "createdAt", "updatedAt")
VALUES ('sj_001', 'inq_001', 'cr_001', 'user_admin_001', 'done', '{"markName":"PETBOWL","classNos":[21,35],"similarityGroupCodes":["G1810","S1289"]}', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "SearchQuery" (id, "searchJobId", "sourceSystem", mode, "requestParams", "queryHash", "cacheHit", "createdAt")
VALUES
  ('sq_001', 'sj_001', 'mock', 'exact_mark', '{"mode":"exact_mark","query":"PETBOWL","markName":"PETBOWL"}', 'seed-query-exact-petbowl', false, NOW()),
  ('sq_002', 'sj_001', 'mock', 'similarity_group', '{"mode":"similarity_group","query":"PETBOWL","markName":"PETBOWL","similarityGroupCodes":["G1810"]}', 'seed-query-simgroup-g1810', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "SearchResult" (id, "searchJobId", "sourceSystem", mode, "applicationNumber", "registerNumber", "markName", "applicantName", "classNo", "designatedGoodsSummary", "statusLabel", "relevanceScore", "detailJson", "isShortlisted", "createdAt")
VALUES
  ('sr_001', 'sj_001', 'mock', 'exact_mark', '402024000001', null, 'PETBOWL', '펫푸드랩 주식회사', 21, '반려동물용 식기, 반려동물용 급식기', '출원', 0.92, '{"source":"mock"}', true, NOW()),
  ('sr_002', 'sj_001', 'mock', 'similarity_group', '402024000002', '4102456780000', 'PETBOWL PRO', '주식회사 펫하우스', 21, '반려동물용 식기, 반려동물용 자동급식기', '등록', 0.89, '{"source":"mock"}', true, NOW()),
  ('sr_003', 'sj_001', 'mock', 'similarity_group', '402024000004', null, 'PAW MARKET', '포마켓 주식회사', 35, '반려동물용품 소매업, 반려동물 간식 판매대행업', '출원', 0.84, '{"source":"mock"}', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "SearchResultSimilarityGroup" (id, "searchResultId", "similarityGroupCode")
VALUES
  ('srsg_001', 'sr_001', 'G1810'),
  ('srsg_002', 'sr_002', 'G1810'),
  ('srsg_003', 'sr_003', 'S1289')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "ReviewReport" (id, "inquiryId", "candidateRunId", "searchJobId", summary, "riskNote", recommendation, "clientReplyDraft", "internalNote", "createdAt", "updatedAt")
VALUES (
  'rr_001', 'inq_001', 'cr_001', 'sj_001',
  'PETBOWL은 제21류 반려동물용 식기/급식기 분야에서 동일 또는 유사한 선행 표지가 일부 확인됩니다.',
  '동일 표장 PETBOWL 출원 및 PETBOWL PRO 등록 이력이 확인되어 제21류 지정상품 범위에서는 중간 이상 리스크가 존재합니다.',
  '제21류는 식기/급식기 중심으로 범위를 정교화하고, 제35류 판매 서비스업 병행 검토를 권고합니다.',
  '안녕하세요. 요청주신 "PETBOWL" 상표에 대해 1차 검토한 결과, 제21류 반려동물용 식기/급식기 분야에서 동일 또는 유사한 선행 표지가 일부 확인되었습니다.',
  '제21류는 선행 상표 리스크가 있어 변형안 또는 복합표장 검토 필요. 제35류는 상대적으로 여지 있음.',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "ReviewEvidence" (id, "reviewReportId", "searchResultId", note, "sortOrder", "createdAt")
VALUES
  ('re_001', 'rr_001', 'sr_001', '동일 표장 출원', 1, NOW()),
  ('re_002', 'rr_001', 'sr_002', '유사 표장 등록 사례', 2, NOW())
ON CONFLICT ("reviewReportId", "searchResultId") DO NOTHING;

-- 8. Inquiry 2 (K-GEL CARE - parsed status)
INSERT INTO "Inquiry" (id, "firmId", "inboxAccountId", "ownerUserId", "classificationVersionId",
  "sourceChannel", title, "proposedMarkName", "rawText", status, "createdAt", "updatedAt")
VALUES (
  'inq_002', 'firm_demo_001', 'inbox_001', 'user_admin_001', 'cv_nice_2026',
  'manual', '케겔운동기구 상표 검토 요청', 'K-GEL CARE',
  '고객 요청: 케겔운동기구 관련 브랜드명을 "K-GEL CARE"로 검토 요청. 향후 의료용 재활운동기구 범위도 고려 중.',
  'parsed', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "ParsedRequest" (id, "inquiryId", "llmProvider", "llmModel", "parsedJson",
  "markNameNormalized", "goodsDescriptionNormalized", "industryGuess", "missingFields", confidence, "isCurrent", "createdAt")
VALUES (
  'pr_002', 'inq_002', 'seed', 'seed-v1',
  '{"markNameCandidates":["K-GEL CARE"],"goodsDescription":"케겔운동기구, 의료용 재활운동기구","industryGuess":"헬스케어 기구","competitorHints":[],"missingFields":[],"confidence":0.86}',
  'K-GEL CARE', '케겔운동기구, 의료용 재활운동기구', '헬스케어 기구', '[]', 0.86, true, NOW()
) ON CONFLICT (id) DO NOTHING;
