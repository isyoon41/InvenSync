'use client';

import React from 'react';
import type { SearchResult } from '@ip-review/domain';

export interface SearchResultsProps {
  results: SearchResult[];
  onToggleShortlist?: (id: string, shortlisted: boolean) => void;
}

type SearchResultWithDetails = SearchResult & {
  similarityGroups?: Array<{ similarityGroupCode?: string }>;
  detailJson?: {
    kiprisUrl?: string;
    searchBasis?: string;
    queryContext?: {
      mode?: string;
      normalizedMarkName?: string;
      candidateTerm?: string;
      normalizedCandidateTerm?: string;
      classNo?: number;
      similarityGroupCode?: string;
      goodsDescription?: string;
    };
    similarityCodes?: string[];
    [key: string]: unknown;
  };
};

const KIPRIS_TM_SEARCH = 'https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark&query=';

function buildKiprisUrl(result: SearchResultWithDetails): string {
  if (result.detailJson?.kiprisUrl) return result.detailJson.kiprisUrl;
  if (result.applicationNumber) {
    return `https://doi.kipris.or.kr/kdoi/searchKdoiInfoReadView.do?applno=${encodeURIComponent(result.applicationNumber)}`;
  }
  if (result.markName) return `${KIPRIS_TM_SEARCH}${encodeURIComponent(result.markName)}`;
  return 'https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark';
}

function getSimilarityGroupCodes(result: SearchResultWithDetails): string[] {
  const relationCodes =
    result.similarityGroups?.map((group) => group.similarityGroupCode).filter(Boolean) ?? [];
  const directCodes = result.similarityGroupCodes ?? [];
  const detailCodes = result.detailJson?.similarityCodes ?? [];
  return Array.from(new Set([...directCodes, ...relationCodes, ...detailCodes])).filter(
    (code): code is string => typeof code === 'string' && code.length > 0
  );
}

function modeLabel(mode?: string): string {
  switch (mode) {
    case 'similarity_group':
      return '유사군 내 상표명 검색';
    case 'exact_mark':
      return '동일 상표명 검색';
    case 'mark_keyword':
      return '상표명 키워드 검색';
    case 'designated_goods':
      return '지정상품 기준 검색';
    default:
      return 'KIPRIS 검색';
  }
}

function getSearchBasis(result: SearchResultWithDetails): string {
  if (result.detailJson?.searchBasis) return result.detailJson.searchBasis;

  const query = result.detailJson?.queryContext;
  if (query?.similarityGroupCode && query?.normalizedMarkName) {
    return `유사군 코드 ${query.similarityGroupCode} 범위에서 정규화 상표명 "${query.normalizedMarkName}"을 기준으로 확인한 KIPRIS 결과입니다.`;
  }
  if (query?.normalizedMarkName) {
    return `정규화 상표명 "${query.normalizedMarkName}"을 기준으로 확인한 KIPRIS 결과입니다.`;
  }
  return 'KIPRIS 상표 출원 속보 검색 결과를 바탕으로 표시한 참고 상표입니다.';
}

export function SearchResults({ results, onToggleShortlist }: SearchResultsProps) {
  const sortedResults = [...results].sort((a, b) => {
    const scoreDiff = (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) as SearchResultWithDetails[];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">유사상표 검색 결과</h2>
          <p className="mt-1 text-sm text-gray-500">
            지정상품 후보의 유사군 코드 범위에서 정규화 상표명을 KIPRIS로 조회한 결과입니다.
          </p>
        </div>
        {results.length > 0 && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {results.length}건
          </span>
        )}
      </div>

      {sortedResults.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center shadow-sm">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedResults.map((result) => {
            const similarityGroupCodes = getSimilarityGroupCodes(result);
            const kiprisUrl = buildKiprisUrl(result);
            const query = result.detailJson?.queryContext;

            return (
              <div key={result.id} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {result.markName || '(상표명 없음)'}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {modeLabel(result.mode)}
                      </span>
                      {result.statusLabel && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {result.statusLabel}
                        </span>
                      )}
                    </div>

                    {result.applicantName && (
                      <p className="mt-1 text-sm text-gray-600">출원인: {result.applicantName}</p>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {result.applicationNumber && (
                        <InfoItem label="출원번호" value={result.applicationNumber} mono />
                      )}
                      {result.registerNumber && (
                        <InfoItem label="등록번호" value={result.registerNumber} mono />
                      )}
                      {result.classNo && (
                        <InfoItem label="류" value={`제${String(result.classNo).padStart(2, '0')}류`} />
                      )}
                      {result.relevanceScore != null && (
                        <InfoItem
                          label="표장명 유사도"
                          value={`${Math.round(result.relevanceScore * 100)}%`}
                          strong
                        />
                      )}
                    </div>

                    {similarityGroupCodes.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          확인 유사군 코드
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {similarityGroupCodes.map((code) => (
                            <span
                              key={code}
                              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        판단 근거
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {getSearchBasis(result)}
                      </p>
                      {query?.candidateTerm && (
                        <p className="mt-2 text-xs text-slate-500">
                          후보 지정상품: {query.candidateTerm}
                        </p>
                      )}
                    </div>

                    {result.designatedGoodsSummary && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          지정상품/지정서비스업
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm text-gray-700">
                          {result.designatedGoodsSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="w-28 flex-shrink-0 space-y-3">
                    {result.sampleImageUrl && (
                      <img
                        src={result.sampleImageUrl}
                        alt={result.markName}
                        className="h-24 w-24 rounded border border-gray-200 object-contain"
                      />
                    )}

                    <a
                      href={kiprisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-blue-200 px-3 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      KIPRIS 보기
                    </a>

                    {onToggleShortlist && (
                      <button
                        onClick={() => onToggleShortlist(result.id, !result.isShortlisted)}
                        className={`w-full rounded px-3 py-2 text-sm font-medium ${
                          result.isShortlisted
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {result.isShortlisted ? '선택 해제' : '근거 선택'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-sm ${strong ? 'font-bold text-red-600' : 'font-medium text-gray-900'} ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
