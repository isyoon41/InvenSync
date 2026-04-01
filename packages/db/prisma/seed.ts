import {
  CandidateRunState,
  CandidateSourceType,
  ExportFormat,
  GoodsTermType,
  InboxAuthType,
  InboxProvider,
  InquirySourceChannel,
  InquiryStatus,
  PrismaClient,
  SearchJobState,
  SearchMode,
  SearchSourceSystem,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

async function ensureFirm(name: string) {
  const existing = await prisma.firm.findFirst({
    where: { name },
  });

  if (existing) return existing;

  return prisma.firm.create({
    data: { name },
  });
}

async function ensureUser(args: {
  firmId: string;
  name: string;
  email: string;
  role: UserRole;
}) {
  return prisma.user.upsert({
    where: { email: args.email },
    update: {
      name: args.name,
      role: args.role,
      firmId: args.firmId,
      isActive: true,
    },
    create: {
      firmId: args.firmId,
      name: args.name,
      email: args.email,
      role: args.role,
      isActive: true,
    },
  });
}

async function ensureInboxAccount(args: {
  firmId: string;
  accountEmail: string;
}) {
  return prisma.inboxAccount.upsert({
    where: { accountEmail: args.accountEmail },
    update: {
      firmId: args.firmId,
      provider: InboxProvider.gmail,
      authType: InboxAuthType.manual,
      isActive: true,
      labelFilter: "INBOX",
    },
    create: {
      firmId: args.firmId,
      provider: InboxProvider.gmail,
      accountEmail: args.accountEmail,
      authType: InboxAuthType.manual,
      isActive: true,
      labelFilter: "INBOX",
    },
  });
}

async function ensureClassificationVersion() {
  return prisma.classificationVersion.upsert({
    where: { label: "NICE-KR-2026-MVP" },
    update: {
      sourceName: "KIPO reference seed",
      isActive: true,
    },
    create: {
      label: "NICE-KR-2026-MVP",
      sourceName: "KIPO reference seed",
      isActive: true,
    },
  });
}

async function reseedGoodsTerms(classificationVersionId: string) {
  await prisma.goodsTerm.deleteMany({
    where: { classificationVersionId },
  });

  const seedTerms = [
    {
      term: "반려동물용 식기",
      classNo: 21,
      termType: GoodsTermType.official_notice_name,
      similarityGroupCodes: ["G1810"],
    },
    {
      term: "반려동물용 자동급식기",
      classNo: 21,
      termType: GoodsTermType.accepted_similar_name,
      similarityGroupCodes: ["G1810"],
    },
    {
      term: "동물용 사료",
      classNo: 31,
      termType: GoodsTermType.official_notice_name,
      similarityGroupCodes: ["G1311"],
    },
    {
      term: "반려동물 간식",
      classNo: 31,
      termType: GoodsTermType.accepted_similar_name,
      similarityGroupCodes: ["G1311"],
    },
    {
      term: "반려동물용품 소매업",
      classNo: 35,
      termType: GoodsTermType.official_notice_name,
      similarityGroupCodes: ["S1289"],
    },
    {
      term: "반려동물 간식 판매대행업",
      classNo: 35,
      termType: GoodsTermType.accepted_similar_name,
      similarityGroupCodes: ["S1289"],
    },
    {
      term: "케겔운동기구",
      classNo: 10,
      termType: GoodsTermType.official_notice_name,
      similarityGroupCodes: ["G1201"],
    },
    {
      term: "의료용 재활운동기구",
      classNo: 10,
      termType: GoodsTermType.accepted_similar_name,
      similarityGroupCodes: ["G1203"],
    },
  ];

  for (const item of seedTerms) {
    await prisma.goodsTerm.create({
      data: {
        classificationVersionId,
        term: item.term,
        classNo: item.classNo,
        termType: item.termType,
        isActive: true,
        sourcePage: "seed",
        similarityGroups: {
          create: item.similarityGroupCodes.map((code, index) => ({
            similarityGroupCode: code,
            isPrimary: index === 0,
          })),
        },
      },
    });
  }
}

async function ensureClient(args: {
  firmId: string;
  name: string;
  companyName: string;
  email: string;
}) {
  const existing = await prisma.client.findFirst({
    where: {
      firmId: args.firmId,
      companyName: args.companyName,
    },
  });

  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data: {
        name: args.name,
        email: args.email,
      },
    });
  }

  return prisma.client.create({
    data: {
      firmId: args.firmId,
      name: args.name,
      companyName: args.companyName,
      email: args.email,
    },
  });
}

async function seedPrimaryInquiry(args: {
  firmId: string;
  clientId: string;
  inboxAccountId: string;
  ownerUserId: string;
  classificationVersionId: string;
}) {
  const title = "반려동물 식기 브랜드 검토 요청";

  await prisma.inquiry.deleteMany({
    where: {
      firmId: args.firmId,
      title,
    },
  });

  const inquiry = await prisma.inquiry.create({
    data: {
      firmId: args.firmId,
      clientId: args.clientId,
      inboxAccountId: args.inboxAccountId,
      ownerUserId: args.ownerUserId,
      classificationVersionId: args.classificationVersionId,
      sourceChannel: InquirySourceChannel.gmail_forward,
      title,
      subject: "[검토요청] PETBOWL 상표 검토",
      senderEmail: "client@example.com",
      proposedMarkName: "PETBOWL",
      rawText: `안녕하세요.
반려동물 식기와 자동급식기 관련 브랜드명을 "PETBOWL"로 생각하고 있습니다.
향후 반려동물 간식 판매 및 온라인 판매 서비스도 검토 중입니다.
상표 검토 요청드립니다.`,
      rawHtml: null,
      status: InquiryStatus.reviewed,
      metadata: {
        forwardedBy: "attorney@firm.local",
        originalChannel: "email",
      },
    },
  });

  await prisma.parsedRequest.create({
    data: {
      inquiryId: inquiry.id,
      llmProvider: "seed",
      llmModel: "seed-v1",
      parsedJson: {
        markNameCandidates: ["PETBOWL"],
        goodsDescription:
          "반려동물용 식기, 자동급식기, 반려동물 간식 판매 및 온라인 판매 서비스",
        industryGuess: "반려동물 용품 및 유통",
        competitorHints: [],
        missingFields: [],
        confidence: 0.93,
      },
      markNameNormalized: "PETBOWL",
      goodsDescriptionNormalized:
        "반려동물용 식기, 자동급식기, 반려동물 간식 판매 및 온라인 판매 서비스",
      industryGuess: "반려동물 용품 및 유통",
      missingFields: [],
      confidence: 0.93,
      isCurrent: true,
    },
  });

  const candidateRun = await prisma.candidateRun.create({
    data: {
      inquiryId: inquiry.id,
      createdByUserId: args.ownerUserId,
      state: CandidateRunState.done,
      runVersion: 1,
      inputSnapshot: {
        parsed: {
          goodsDescription:
            "반려동물용 식기, 자동급식기, 반려동물 간식 판매 및 온라인 판매 서비스",
        },
      },
    },
  });

  const candidate1 = await prisma.goodsCandidate.create({
    data: {
      candidateRunId: candidateRun.id,
      term: "반려동물용 식기",
      normalizedTerm: "반려동물용 식기",
      classNo: 21,
      sourceType: CandidateSourceType.official_notice_name,
      confidence: 0.98,
      rationale: "고시상품명칭과 직접 매칭",
      isSelected: true,
      sortOrder: 1,
      similarityGroups: {
        create: [
          {
            similarityGroupCode: "G1810",
            isPrimary: true,
          },
        ],
      },
    },
  });

  const candidate2 = await prisma.goodsCandidate.create({
    data: {
      candidateRunId: candidateRun.id,
      term: "반려동물용 자동급식기",
      normalizedTerm: "반려동물용 자동급식기",
      classNo: 21,
      sourceType: CandidateSourceType.accepted_similar_name,
      confidence: 0.92,
      rationale: "유사상품 명칭 사전과 매칭",
      isSelected: true,
      sortOrder: 2,
      similarityGroups: {
        create: [
          {
            similarityGroupCode: "G1810",
            isPrimary: true,
          },
        ],
      },
    },
  });

  const candidate3 = await prisma.goodsCandidate.create({
    data: {
      candidateRunId: candidateRun.id,
      term: "반려동물용품 소매업",
      normalizedTerm: "반려동물용품 소매업",
      classNo: 35,
      sourceType: CandidateSourceType.official_notice_name,
      confidence: 0.9,
      rationale: "판매·유통 맥락이 있어 제35류 서비스업 후보 추가",
      isSelected: true,
      sortOrder: 3,
      similarityGroups: {
        create: [
          {
            similarityGroupCode: "S1289",
            isPrimary: true,
          },
        ],
      },
    },
  });

  const searchJob = await prisma.searchJob.create({
    data: {
      inquiryId: inquiry.id,
      candidateRunId: candidateRun.id,
      createdByUserId: args.ownerUserId,
      state: SearchJobState.done,
      queryStrategy: {
        markName: "PETBOWL",
        classNos: [21, 35],
        similarityGroupCodes: ["G1810", "S1289"],
      },
      completedAt: new Date(),
    },
  });

  await prisma.searchQuery.create({
    data: {
      searchJobId: searchJob.id,
      sourceSystem: SearchSourceSystem.mock,
      mode: SearchMode.exact_mark,
      requestParams: {
        mode: "exact_mark",
        query: "PETBOWL",
        markName: "PETBOWL",
      },
      queryHash: "seed-query-exact-petbowl",
      cacheHit: false,
    },
  });

  await prisma.searchQuery.create({
    data: {
      searchJobId: searchJob.id,
      sourceSystem: SearchSourceSystem.mock,
      mode: SearchMode.similarity_group,
      requestParams: {
        mode: "similarity_group",
        query: "PETBOWL",
        markName: "PETBOWL",
        similarityGroupCodes: ["G1810"],
      },
      queryHash: "seed-query-simgroup-g1810",
      cacheHit: false,
    },
  });

  const result1 = await prisma.searchResult.create({
    data: {
      searchJobId: searchJob.id,
      sourceSystem: SearchSourceSystem.mock,
      mode: SearchMode.exact_mark,
      applicationNumber: "402024000001",
      registerNumber: null,
      markName: "PETBOWL",
      applicantName: "펫푸드랩 주식회사",
      classNo: 21,
      designatedGoodsSummary: "반려동물용 식기, 반려동물용 급식기",
      statusLabel: "출원",
      sampleImageUrl: null,
      relevanceScore: 0.92,
      detailJson: {
        source: "mock",
      },
      rawXml: null,
      isShortlisted: true,
      similarityGroups: {
        create: [
          {
            similarityGroupCode: "G1810",
          },
        ],
      },
    },
  });

  const result2 = await prisma.searchResult.create({
    data: {
      searchJobId: searchJob.id,
      sourceSystem: SearchSourceSystem.mock,
      mode: SearchMode.similarity_group,
      applicationNumber: "402024000002",
      registerNumber: "4102456780000",
      markName: "PETBOWL PRO",
      applicantName: "주식회사 펫하우스",
      classNo: 21,
      designatedGoodsSummary: "반려동물용 식기, 반려동물용 자동급식기",
      statusLabel: "등록",
      sampleImageUrl: null,
      relevanceScore: 0.89,
      detailJson: {
        source: "mock",
      },
      rawXml: null,
      isShortlisted: true,
      similarityGroups: {
        create: [
          {
            similarityGroupCode: "G1810",
          },
        ],
      },
    },
  });

  const result3 = await prisma.searchResult.create({
    data: {
      searchJobId: searchJob.id,
      sourceSystem: SearchSourceSystem.mock,
      mode: SearchMode.similarity_group,
      applicationNumber: "402024000004",
      registerNumber: null,
      markName: "PAW MARKET",
      applicantName: "포마켓 주식회사",
      classNo: 35,
      designatedGoodsSummary: "반려동물용품 소매업, 반려동물 간식 판매대행업",
      statusLabel: "출원",
      sampleImageUrl: null,
      relevanceScore: 0.84,
      detailJson: {
        source: "mock",
      },
      rawXml: null,
      isShortlisted: false,
      similarityGroups: {
        create: [
          {
            similarityGroupCode: "S1289",
          },
        ],
      },
    },
  });

  const reviewReport = await prisma.reviewReport.create({
    data: {
      inquiryId: inquiry.id,
      candidateRunId: candidateRun.id,
      searchJobId: searchJob.id,
      summary:
        "PETBOWL은 제21류 반려동물용 식기/급식기 분야에서 동일 또는 유사한 선행 표지가 일부 확인됩니다.",
      riskNote:
        "동일 표장 PETBOWL 출원 및 PETBOWL PRO 등록 이력이 확인되어 제21류 지정상품 범위에서는 중간 이상 리스크가 존재합니다.",
      recommendation:
        "제21류는 식기/급식기 중심으로 범위를 정교화하고, 제35류 판매 서비스업 병행 검토를 권고합니다.",
      clientReplyDraft: `안녕하세요.
요청주신 "PETBOWL" 상표에 대해 1차 검토한 결과,
제21류 반려동물용 식기/급식기 분야에서 동일 또는 유사한 선행 표지가 일부 확인되었습니다.
따라서 지정상품 범위를 조정하거나 표장 보완 여부를 함께 검토하시는 것을 권고드립니다.`,
      internalNote:
        "제21류는 선행 상표 리스크가 있어 변형안 또는 복합표장 검토 필요. 제35류는 상대적으로 여지 있음.",
    },
  });

  await prisma.reviewEvidence.create({
    data: {
      reviewReportId: reviewReport.id,
      searchResultId: result1.id,
      note: "동일 표장 출원",
      sortOrder: 1,
    },
  });

  await prisma.reviewEvidence.create({
    data: {
      reviewReportId: reviewReport.id,
      searchResultId: result2.id,
      note: "유사 표장 등록 사례",
      sortOrder: 2,
    },
  });

  await prisma.caseDraft.create({
    data: {
      inquiryId: inquiry.id,
      reviewReportId: reviewReport.id,
      exportFormat: ExportFormat.json,
      draftJson: {
        inquiryId: inquiry.id,
        title: inquiry.title,
        proposedMarkName: inquiry.proposedMarkName,
        recommendedGoods: [
          {
            term: candidate1.term,
            classNo: candidate1.classNo,
            similarityGroupCodes: ["G1810"],
          },
          {
            term: candidate2.term,
            classNo: candidate2.classNo,
            similarityGroupCodes: ["G1810"],
          },
          {
            term: candidate3.term,
            classNo: candidate3.classNo,
            similarityGroupCodes: ["S1289"],
          },
        ],
        reviewSummary:
          "제21류에서 선행 상표가 확인되어 지정상품 범위 조정이 필요하며, 제35류 병행 검토 권고",
        evidences: [
          {
            applicationNumber: "402024000001",
            markName: "PETBOWL",
          },
          {
            applicationNumber: "402024000002",
            markName: "PETBOWL PRO",
          },
          {
            applicationNumber: "402024000004",
            markName: "PAW MARKET",
          },
        ],
      },
    },
  });

  return inquiry;
}

async function seedSecondaryInquiry(args: {
  firmId: string;
  inboxAccountId: string;
  ownerUserId: string;
  classificationVersionId: string;
}) {
  const title = "케겔운동기구 상표 검토 요청";

  await prisma.inquiry.deleteMany({
    where: {
      firmId: args.firmId,
      title,
    },
  });

  const inquiry = await prisma.inquiry.create({
    data: {
      firmId: args.firmId,
      inboxAccountId: args.inboxAccountId,
      ownerUserId: args.ownerUserId,
      classificationVersionId: args.classificationVersionId,
      sourceChannel: InquirySourceChannel.manual,
      title,
      subject: null,
      senderEmail: null,
      proposedMarkName: "K-GEL CARE",
      rawText: `고객 요청:
케겔운동기구 관련 브랜드명을 "K-GEL CARE"로 검토 요청.
향후 의료용 재활운동기구 범위도 고려 중.`,
      rawHtml: null,
      status: InquiryStatus.parsed,
    },
  });

  await prisma.parsedRequest.create({
    data: {
      inquiryId: inquiry.id,
      llmProvider: "seed",
      llmModel: "seed-v1",
      parsedJson: {
        markNameCandidates: ["K-GEL CARE"],
        goodsDescription: "케겔운동기구, 의료용 재활운동기구",
        industryGuess: "헬스케어 기구",
        competitorHints: [],
        missingFields: [],
        confidence: 0.86,
      },
      markNameNormalized: "K-GEL CARE",
      goodsDescriptionNormalized: "케겔운동기구, 의료용 재활운동기구",
      industryGuess: "헬스케어 기구",
      missingFields: [],
      confidence: 0.86,
      isCurrent: true,
    },
  });

  return inquiry;
}

async function main() {
  const firm = await ensureFirm("IP Review Desk Demo Firm");

  const adminUser = await ensureUser({
    firmId: firm.id,
    name: "윤인식",
    email: "admin@ipreview.local",
    role: UserRole.admin,
  });

  await ensureUser({
    firmId: firm.id,
    name: "홍준 변리사",
    email: "reviewer@ipreview.local",
    role: UserRole.reviewer,
  });

  const inboxAccount = await ensureInboxAccount({
    firmId: firm.id,
    accountEmail: "trademark.inbox26@gmail.com",
  });

  const classificationVersion = await ensureClassificationVersion();
  await reseedGoodsTerms(classificationVersion.id);

  const client = await ensureClient({
    firmId: firm.id,
    name: "김고객",
    companyName: "펫푸드랩 주식회사",
    email: "client@example.com",
  });

  const inquiry1 = await seedPrimaryInquiry({
    firmId: firm.id,
    clientId: client.id,
    inboxAccountId: inboxAccount.id,
    ownerUserId: adminUser.id,
    classificationVersionId: classificationVersion.id,
  });

  const inquiry2 = await seedSecondaryInquiry({
    firmId: firm.id,
    inboxAccountId: inboxAccount.id,
    ownerUserId: adminUser.id,
    classificationVersionId: classificationVersion.id,
  });

  console.log("✅ Seed completed");
  console.log({
    firmId: firm.id,
    inboxAccount: inboxAccount.accountEmail,
    inquiryIds: [inquiry1.id, inquiry2.id],
  });
}

main()
  .catch((error) => {
    console.error("❌ Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
