import subprocess, json

TOKEN = "sbp_0e16fd510353b332b738a27385fd860b99a494d1"
PROJECT = "qzijgyfplsmdavyewkqb"

def run_sql(sql, label=""):
    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}",
        "-X", "POST", f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": sql})
    ], capture_output=True, text=True)
    out = result.stdout.strip()
    lines = out.rsplit("\n", 1)
    status = lines[-1] if len(lines) > 1 else "?"
    body = lines[0] if len(lines) > 1 else out
    if status != "201":
        print(f"  FAIL {label}: HTTP {status} -- {body[:300]}")
    else:
        print(f"  OK {label}")

# Inquiry 1 (PETBOWL - reviewed)
run_sql("""INSERT INTO "Inquiry" (id, "firmId", "clientId", "inboxAccountId", "ownerUserId", "classificationVersionId",
  "sourceChannel", title, subject, "senderEmail", "proposedMarkName", "rawText", status, "createdAt", "updatedAt")
VALUES (
  'inq_001', 'firm_demo_001', 'client_001', 'inbox_001', 'user_admin_001', 'cv_nice_2026',
  'gmail_forward', 'PETBOWL trademark review', '[Review] PETBOWL trademark',
  'client@example.com', 'PETBOWL',
  'Hello. We are considering the brand name PETBOWL for pet food bowls and automatic feeders.',
  'reviewed', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING""", "Inquiry 1")

run_sql("""INSERT INTO "ParsedRequest" (id, "inquiryId", "llmProvider", "llmModel", "parsedJson",
  "markNameNormalized", "goodsDescriptionNormalized", "industryGuess", "missingFields", confidence, "isCurrent", "createdAt")
VALUES (
  'pr_001', 'inq_001', 'seed', 'seed-v1',
  '{"markNameCandidates":["PETBOWL"],"goodsDescription":"pet food bowls, automatic feeders","industryGuess":"pet products","competitorHints":[],"missingFields":[],"confidence":0.93}',
  'PETBOWL', 'pet food bowls, automatic feeders',
  'pet products', '[]', 0.93, true, NOW()
) ON CONFLICT (id) DO NOTHING""", "ParsedRequest 1")

run_sql("""INSERT INTO "CandidateRun" (id, "inquiryId", "createdByUserId", state, "runVersion", "inputSnapshot", "createdAt", "updatedAt")
VALUES ('cr_001', 'inq_001', 'user_admin_001', 'done', 1, '{"parsed":{"goodsDescription":"pet food bowls, automatic feeders"}}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING""", "CandidateRun 1")

run_sql("""INSERT INTO "GoodsCandidate" (id, "candidateRunId", term, "normalizedTerm", "classNo", "sourceType", confidence, rationale, "isSelected", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('gc_001', 'cr_001', 'pet food bowls', 'pet food bowls', 21, 'official_notice_name', 0.98, 'Direct match with official goods name', true, 1, NOW(), NOW()),
  ('gc_002', 'cr_001', 'automatic pet feeders', 'automatic pet feeders', 21, 'accepted_similar_name', 0.92, 'Match with similar goods dictionary', true, 2, NOW(), NOW()),
  ('gc_003', 'cr_001', 'pet supply retail', 'pet supply retail', 35, 'official_notice_name', 0.90, 'Class 35 service candidate from sales context', true, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING""", "GoodsCandidate")

run_sql("""INSERT INTO "GoodsCandidateSimilarityGroup" (id, "goodsCandidateId", "similarityGroupCode", "isPrimary")
VALUES
  ('gcsg_001', 'gc_001', 'G1810', true),
  ('gcsg_002', 'gc_002', 'G1810', true),
  ('gcsg_003', 'gc_003', 'S1289', true)
ON CONFLICT (id) DO NOTHING""", "GoodsCandidateSG")

run_sql("""INSERT INTO "SearchJob" (id, "inquiryId", "candidateRunId", "createdByUserId", state, "queryStrategy", "completedAt", "createdAt", "updatedAt")
VALUES ('sj_001', 'inq_001', 'cr_001', 'user_admin_001', 'done', '{"markName":"PETBOWL","classNos":[21,35]}', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING""", "SearchJob")

run_sql("""INSERT INTO "SearchQuery" (id, "searchJobId", "sourceSystem", mode, "requestParams", "queryHash", "cacheHit", "createdAt")
VALUES
  ('sq_001', 'sj_001', 'mock', 'exact_mark', '{"query":"PETBOWL"}', 'seed-exact-petbowl', false, NOW()),
  ('sq_002', 'sj_001', 'mock', 'similarity_group', '{"query":"PETBOWL","groups":["G1810"]}', 'seed-sim-g1810', false, NOW())
ON CONFLICT (id) DO NOTHING""", "SearchQuery")

run_sql("""INSERT INTO "SearchResult" (id, "searchJobId", "sourceSystem", mode, "applicationNumber", "registerNumber", "markName", "applicantName", "classNo", "designatedGoodsSummary", "statusLabel", "relevanceScore", "detailJson", "isShortlisted", "createdAt")
VALUES
  ('sr_001', 'sj_001', 'mock', 'exact_mark', '402024000001', null, 'PETBOWL', 'Pet Food Lab Co.', 21, 'pet food bowls, pet feeders', 'applied', 0.92, '{"source":"mock"}', true, NOW()),
  ('sr_002', 'sj_001', 'mock', 'similarity_group', '402024000002', '4102456780000', 'PETBOWL PRO', 'PetHouse Co.', 21, 'pet food bowls, automatic feeders', 'registered', 0.89, '{"source":"mock"}', true, NOW()),
  ('sr_003', 'sj_001', 'mock', 'similarity_group', '402024000004', null, 'PAW MARKET', 'PawMarket Co.', 35, 'pet supply retail, pet snack sales', 'applied', 0.84, '{"source":"mock"}', false, NOW())
ON CONFLICT (id) DO NOTHING""", "SearchResult")

run_sql("""INSERT INTO "SearchResultSimilarityGroup" (id, "searchResultId", "similarityGroupCode")
VALUES
  ('srsg_001', 'sr_001', 'G1810'),
  ('srsg_002', 'sr_002', 'G1810'),
  ('srsg_003', 'sr_003', 'S1289')
ON CONFLICT (id) DO NOTHING""", "SearchResultSG")

run_sql("""INSERT INTO "ReviewReport" (id, "inquiryId", "candidateRunId", "searchJobId", summary, "riskNote", recommendation, "clientReplyDraft", "internalNote", "createdAt", "updatedAt")
VALUES (
  'rr_001', 'inq_001', 'cr_001', 'sj_001',
  'PETBOWL: Similar prior marks found in Class 21 pet food bowls/feeders.',
  'Identical mark PETBOWL applied and PETBOWL PRO registered - medium-high risk in Class 21.',
  'Refine Class 21 scope, consider Class 35 retail services in parallel.',
  'Dear client, we reviewed PETBOWL and found similar prior marks in Class 21.',
  'Class 21 has prior trademark risk. Class 35 has more room.',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING""", "ReviewReport")

run_sql("""INSERT INTO "ReviewEvidence" (id, "reviewReportId", "searchResultId", note, "sortOrder", "createdAt")
VALUES
  ('re_001', 'rr_001', 'sr_001', 'Identical mark application', 1, NOW()),
  ('re_002', 'rr_001', 'sr_002', 'Similar mark registration', 2, NOW())
ON CONFLICT ("reviewReportId", "searchResultId") DO NOTHING""", "ReviewEvidence")

# Inquiry 2 (K-GEL CARE - parsed)
run_sql("""INSERT INTO "Inquiry" (id, "firmId", "inboxAccountId", "ownerUserId", "classificationVersionId",
  "sourceChannel", title, "proposedMarkName", "rawText", status, "createdAt", "updatedAt")
VALUES (
  'inq_002', 'firm_demo_001', 'inbox_001', 'user_admin_001', 'cv_nice_2026',
  'manual', 'K-GEL CARE trademark review', 'K-GEL CARE',
  'Client request: trademark review for kegel exercise equipment under brand K-GEL CARE.',
  'parsed', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING""", "Inquiry 2")

run_sql("""INSERT INTO "ParsedRequest" (id, "inquiryId", "llmProvider", "llmModel", "parsedJson",
  "markNameNormalized", "goodsDescriptionNormalized", "industryGuess", "missingFields", confidence, "isCurrent", "createdAt")
VALUES (
  'pr_002', 'inq_002', 'seed', 'seed-v1',
  '{"markNameCandidates":["K-GEL CARE"],"goodsDescription":"kegel exercise equipment, medical rehabilitation equipment","industryGuess":"healthcare equipment","competitorHints":[],"missingFields":[],"confidence":0.86}',
  'K-GEL CARE', 'kegel exercise equipment, medical rehabilitation equipment', 'healthcare equipment', '[]', 0.86, true, NOW()
) ON CONFLICT (id) DO NOTHING""", "ParsedRequest 2")

print("\nSeed complete!")
