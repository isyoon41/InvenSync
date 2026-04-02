'use client';

import React, { useState } from 'react';
import type { ParsedInquiryData } from '@ip-review/domain';

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정규화 지정상품
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <p className="text-gray-700 whitespace-pre-wrap">
                {parsedData.goodsDescriptionNormalized || '미확인'}
              </p>
            </div>
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
