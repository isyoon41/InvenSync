'use client';

import React from 'react';
import type { GoodsCandidate } from '@ip-review/domain';

export interface CandidateReviewProps {
  candidates: GoodsCandidate[];
  onToggleSelection?: (id: string, selected: boolean) => void;
  onUpdateRationale?: (id: string, rationale: string) => void;
}

const KIPRIS_GOODS_SEARCH = 'https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark&query=';

function buildKiprisGoodsUrl(term: string): string {
  return `${KIPRIS_GOODS_SEARCH}${encodeURIComponent(term)}`;
}

const sourceTypeConfig: Record<string, { label: string; badge: string; needsVerify: boolean }> = {
  official_notice_name:   { label: 'KIPRIS 고시명칭', badge: 'bg-green-100 text-green-700', needsVerify: false },
  accepted_similar_name:  { label: 'KIPRIS 유사명칭', badge: 'bg-blue-100 text-blue-700',  needsVerify: false },
  ai_generated:           { label: 'AI 추천',         badge: 'bg-amber-100 text-amber-700', needsVerify: true  },
  manual:                 { label: '수동 입력',        badge: 'bg-gray-100 text-gray-700',   needsVerify: true  },
  competitor_reference:   { label: '경쟁사 참조',      badge: 'bg-purple-100 text-purple-700', needsVerify: true },
};

export function CandidateReview({
  candidates,
  onToggleSelection,
  onUpdateRationale,
}: CandidateReviewProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">🔍 지정상품 후보</h2>
        <p className="text-sm text-gray-600 mt-1">
          {candidates.length}개 후보 생성됨
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={candidate.isSelected}
                    onChange={(e) => onToggleSelection?.(candidate.id, e.target.checked)}
                    className="w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {candidate.term}
                    </h3>
                    <p className="text-sm text-gray-600">{candidate.normalizedTerm}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider">
                      류 (Class)
                    </label>
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.classNo}류
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider">
                      출처
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const cfg = sourceTypeConfig[candidate.sourceType] ?? { label: candidate.sourceType, badge: 'bg-gray-100 text-gray-700', needsVerify: true };
                        return (
                          <>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            <a
                              href={buildKiprisGoodsUrl(candidate.term)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              KIPRIS{cfg.needsVerify ? ' 검증' : ' 확인'}
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider">
                      신뢰도
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(candidate.confidence * 100)}%
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${candidate.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-gray-600">근거</label>
                  <textarea
                    value={candidate.rationale}
                    onChange={(e) => onUpdateRationale?.(candidate.id, e.target.value)}
                    className="mt-1 w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="이 후보에 대한 근거를 입력하세요..."
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">지정상품 후보가 없습니다</p>
        </div>
      )}
    </div>
  );
}
