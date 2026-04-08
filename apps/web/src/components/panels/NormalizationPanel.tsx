'use client';

import React, { useState } from 'react';
import type { ParsedInquiryData, ParsedNormalizedGood } from '@ip-review/domain';

type NormalizedGoodsRow = ParsedNormalizedGood & {
  classNo: number;
  term: string;
};

const KIPRIS_GOODS_SEARCH = 'https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark&query=';

function formatClassLabel(classNo: number): string {
  return Number.isInteger(classNo) && classNo > 0
    ? `제${String(classNo).padStart(2, '0')}류`
    : '류 미확인';
}

function buildKiprisGoodsUrl(term: string): string {
  return `${KIPRIS_GOODS_SEARCH}${encodeURIComponent(term)}`;
}

function splitTerms(value: string): string[] {
  return value
    .split(/\n|,|，|;|；|ㆍ|·/g)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function parseGoodsByClass(text?: string, targetClasses: number[] = []): NormalizedGoodsRow[] {
  const source = text?.trim();
  if (!source) return [];

  const rows: NormalizedGoodsRow[] = [];
  const classPattern = /(?:제)?(\d{1,2})\s*류\s*[:：\-–—]?\s*([\s\S]*?)(?=(?:제)?\d{1,2}\s*류|$)/g;
  let match: RegExpExecArray | null;

  while ((match = classPattern.exec(source)) !== null) {
    const classNo = Number(match[1]);
    const body = match[2]?.trim();
    if (!Number.isInteger(classNo) || !body) continue;

    for (const term of splitTerms(body)) {
      rows.push({
        classNo,
        term,
        evidenceLabel: 'KIPRIS 상품분류 검색',
        basis: 'Claude가 정규화한 지정상품/지정서비스업 문장에서 추출',
      });
    }
  }

  if (rows.length > 0) return rows;

  const fallbackClassNo = targetClasses.length === 1 ? targetClasses[0] : 0;
  return splitTerms(source).map((term) => ({
    classNo: fallbackClassNo,
    term,
    evidenceLabel: 'KIPRIS 상품분류 검색',
    basis: targetClasses.length > 1
      ? '류별 세부 구분은 다음 재분석부터 구조화되어 표시됩니다'
      : 'Claude가 정규화한 지정상품/지정서비스업 문장에서 추출',
  }));
}

function getNormalizedGoodsRows(parsedData: ParsedInquiryData): NormalizedGoodsRow[] {
  const structured = (parsedData.normalizedGoods ?? [])
    .filter((item): item is NormalizedGoodsRow => (
      Number.isInteger(item.classNo) &&
      item.classNo > 0 &&
      item.classNo <= 45 &&
      typeof item.term === 'string' &&
      item.term.trim().length > 0
    ))
    .map((item) => ({
      ...item,
      term: item.term.trim(),
      evidenceLabel: item.evidenceLabel || 'KIPRIS 상품분류 검색',
    }));

  return structured.length > 0
    ? structured
    : parseGoodsByClass(parsedData.goodsDescriptionNormalized, parsedData.targetClasses);
}

function groupGoodsByClass(rows: NormalizedGoodsRow[]): Array<[number, NormalizedGoodsRow[]]> {
  const grouped = rows.reduce<Record<number, NormalizedGoodsRow[]>>((acc, row) => {
    const classNo = row.classNo || 0;
    if (!acc[classNo]) acc[classNo] = [];
    acc[classNo].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([classNo, items]) => [Number(classNo), items] as [number, NormalizedGoodsRow[]])
    .sort(([left], [right]) => left - right);
}

export interface NormalizationPanelProps {
  inquiryId: string;
  parsedData?: ParsedInquiryData;
  loading?: boolean;
  onRegenerate?: () => void;
  onProceedToCandidates?: () => void;
}

export function NormalizationPanel({
  inquiryId,
  parsedData,
  loading = false,
  onRegenerate,
  onProceedToCandidates,
}: NormalizationPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!parsedData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">정규화 데이터가 없습니다</p>
          <p className="text-sm text-gray-400 mt-2">
            &ldquo;정규화 시작&rdquo; 버튼을 눌러 의뢰를 분석하세요
          </p>
        </div>
      </div>
    );
  }

  const confidenceColor =
    (parsedData.confidence || 0) >= 0.8
      ? 'bg-green-100 text-green-800'
      : (parsedData.confidence || 0) >= 0.6
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800';
  const normalizedGoodsGroups = groupGoodsByClass(getNormalizedGoodsRows(parsedData));

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 헤더 */}
      <div
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-lg font-semibold text-gray-900">
          정규화 결과
        </h2>
        <div className="flex items-center gap-4">
          {parsedData.confidence && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${confidenceColor}`}
            >
              신뢰도: {(parsedData.confidence * 100).toFixed(0)}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* 내용 */}
      {expanded && (
        <div className="px-6 py-4 space-y-6">
          {/* 정규화 상표명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정규화 상표명
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <p className="text-lg font-semibold text-gray-900">
                {parsedData.markNameNormalized || '미확인'}
              </p>
            </div>
          </div>

          {/* 정규화 지정상품 */}
          <div>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  정규화 지정상품/지정서비스업
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  고객 의뢰와 첨부자료를 분석해 류별로 정리한 1차 출원 검토 대상입니다.
                </p>
              </div>
              {parsedData.targetClasses && parsedData.targetClasses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.targetClasses.map((classNo) => (
                    <span
                      key={classNo}
                      className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                    >
                      {formatClassLabel(classNo)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {normalizedGoodsGroups.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {parsedData.goodsDescriptionNormalized || '미확인'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {normalizedGoodsGroups.map(([classNo, rows]) => (
                  <section
                    key={classNo}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {formatClassLabel(classNo)}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {rows.length}개 지정상품/지정서비스업
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-white">
                          <tr>
                            <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              류
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              지정상품/지정서비스업
                            </th>
                            <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              근거 링크
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {rows.map((row, index) => (
                            <tr key={`${row.classNo}-${row.term}-${index}`}>
                              <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-700">
                                {formatClassLabel(row.classNo)}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-slate-900">{row.term}</div>
                                {row.basis && (
                                  <div className="mt-1 text-xs leading-5 text-slate-500">
                                    {row.basis}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <a
                                  href={row.evidenceUrl || buildKiprisGoodsUrl(row.term)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  {row.evidenceLabel || 'KIPRIS 확인'}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* 추정 업종 */}
          {parsedData.industry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                추정 업종
              </label>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {parsedData.industry}
              </div>
            </div>
          )}

          {/* 누락 정보 */}
          {parsedData.missingFields && parsedData.missingFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                누락 정보
              </label>
              <div className="space-y-2">
                {parsedData.missingFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mr-2 mb-2"
                  >
                    {field}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 분석 메모 */}
          {parsedData.reasoning && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                분석 메모
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm text-gray-700">{parsedData.reasoning}</p>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200 disabled:text-gray-400 disabled:border-gray-200"
              >
                {loading ? '분석 중...' : '🔄 다시 분석'}
              </button>
            )}
            {onProceedToCandidates && (
              <button
                onClick={onProceedToCandidates}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                지정상품 설계로 →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
