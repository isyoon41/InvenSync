import { NextRequest, NextResponse } from 'next/server';
import { InquiryParseWorkflow } from '@ip-review/workflows';
import { getRepositoryContainer } from '@ip-review/db';
import { createClaudeOnlyLLMPort } from '@ip-review/llm-engine';
import { createKiprisOnlyTrademarkSearchPort } from '@ip-review/kipris-client';

function compactQuery(value?: string | null, maxLength = 80): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function inferPreClaudeMarkQuery(inquiry: {
  title: string;
  rawText: string;
  proposedMarkName?: string | null;
}): string {
  if (inquiry.proposedMarkName?.trim()) return compactQuery(inquiry.proposedMarkName, 60);

  const text = `${inquiry.title}\n${inquiry.rawText}`;
  const beforeTrademark = text.match(/([A-Za-z0-9][A-Za-z0-9._ -]{1,40})\s*상표/);
  if (beforeTrademark?.[1]) return compactQuery(beforeTrademark[1], 60);

  const firstLatinToken = text.match(/\b[A-Za-z][A-Za-z0-9._-]{2,40}\b/);
  if (firstLatinToken?.[0]) return compactQuery(firstLatinToken[0], 60);

  return compactQuery(inquiry.title, 60);
}

async function buildKiprisNormalizationEvidence(inquiry: {
  title: string;
  rawText: string;
  proposedMarkName?: string | null;
}): Promise<string> {
  const searchPort = createKiprisOnlyTrademarkSearchPort();
  const markQuery = inferPreClaudeMarkQuery(inquiry);
  const goodsQuery = compactQuery(inquiry.rawText, 80);

  const [markResults, goodsResults] = await Promise.all([
    markQuery
      ? searchPort.search({
          sourceSystem: 'kipris',
          mode: 'exact_mark',
          params: { markName: markQuery },
        })
      : Promise.resolve([]),
    goodsQuery
      ? searchPort.search({
          sourceSystem: 'kipris',
          mode: 'designated_goods',
          params: { goodsDescription: goodsQuery },
        })
      : Promise.resolve([]),
  ]);

  return JSON.stringify(
    {
      policy: 'KIPRIS was queried before Claude normalization. Use these results as first-priority reference evidence; use the customer request as source of truth when evidence is sparse or conflicting.',
      queries: { markQuery, goodsQuery },
      markResults: markResults.slice(0, 5).map((result) => ({
        markName: result.markName,
        applicantName: result.applicantName,
        classNo: result.classNo,
        statusLabel: result.statusLabel,
        designatedGoodsSummary: result.designatedGoodsSummary,
        applicationNumber: result.applicationNumber,
        relevanceScore: result.relevanceScore,
      })),
      goodsResults: goodsResults.slice(0, 5).map((result) => ({
        markName: result.markName,
        applicantName: result.applicantName,
        classNo: result.classNo,
        statusLabel: result.statusLabel,
        designatedGoodsSummary: result.designatedGoodsSummary,
        applicationNumber: result.applicationNumber,
      })),
    },
    null,
    2
  );
}

/**
 * POST /api/inquiries/[id]/parse
 * 의뢰 정규화 — KIPRIS 1차 근거를 참고해 Claude가 상표명·지정상품 추출
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositories = getRepositoryContainer();

    const inquiry = await repositories.inquiries.findById(params.id);
    if (!inquiry) {
      return NextResponse.json(
        { error: `의뢰 ${params.id}를 찾을 수 없습니다` },
        { status: 404 }
      );
    }

    if (!['new', 'parsed'].includes(inquiry.status)) {
      return NextResponse.json(
        { error: `정규화는 '신규' 또는 '정규화 완료' 상태에서만 가능합니다. 현재 상태: ${inquiry.status}` },
        { status: 422 }
      );
    }

    const llmPort = createClaudeOnlyLLMPort();
    const kiprisNormalizationEvidence = await buildKiprisNormalizationEvidence(inquiry);

    const workflow = new InquiryParseWorkflow(repositories);
    const result = await workflow.execute({
      inquiryId: params.id,
      llmPort,
      kiprisNormalizationEvidence,
    });

    return NextResponse.json({
      success: true,
      inquiry: result.inquiry,
      parsedData: result.parsedData,
      markNameNormalized: result.markNameNormalized,
      goodsDescription: result.goodsDescription,
    });
  } catch (error) {
    console.error('POST /api/inquiries/[id]/parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '정규화 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
