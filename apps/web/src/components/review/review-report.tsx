'use client';

import React, { useState } from 'react';
import type { ReviewReport } from '@ip-review/domain';

export interface ReviewReportProps {
  report: ReviewReport;
  editable?: boolean;
  onSave?: (updates: Partial<ReviewReport>) => void;
  onApprove?: () => void;
}

export function ReviewReport({
  report,
  editable = false,
  onSave,
  onApprove,
}: ReviewReportProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    summary: report.summary || '',
    riskNote: report.riskNote || '',
    recommendation: report.recommendation || '',
    clientReplyDraft: report.clientReplyDraft || '',
    internalNote: report.internalNote || '',
  });

  const handleSave = () => {
    onSave?.(formData);
    setEditMode(false);
  };

  const isApproved = !!report.approvedAt;

  return (
    <div className="space-y-6">
      {/* 상태 바 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">검토 리포트</h1>
            {isApproved && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {(report as any).approvedBy?.name ?? report.approvedByUserId} 승인 ·{' '}
                {report.approvedAt ? new Date(report.approvedAt).toLocaleDateString('ko-KR') : ''}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {editable && !isApproved && (
              <>
                {editMode ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                  >
                    ✎ 수정
                  </button>
                )}
              </>
            )}
            {onApprove && !isApproved && (
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✓ 승인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 검토 요약 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">검토 요약</h2>
        {editMode ? (
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="검토 요약을 입력하세요..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.summary || '검토 요약 없음'}
          </div>
        )}
      </div>

      {/* 위험 분석 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">위험 분석</h2>
        {editMode ? (
          <textarea
            value={formData.riskNote}
            onChange={(e) => setFormData({ ...formData, riskNote: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="위험 분석 내용을 입력하세요..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.riskNote || '위험 분석 없음'}
          </div>
        )}
      </div>

      {/* 출원 가능성 평가 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">출원 가능성 평가</h2>
        {editMode ? (
          <textarea
            value={formData.recommendation}
            onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="출원 가능성 평가를 입력하세요..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.recommendation || '평가 없음'}
          </div>
        )}
      </div>

      {/* 고객 회신 초안 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">고객 회신 초안</h2>
        {editMode ? (
          <textarea
            value={formData.clientReplyDraft}
            onChange={(e) => setFormData({ ...formData, clientReplyDraft: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="고객 회신 초안을 입력하세요..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.clientReplyDraft || '회신 초안 없음'}
          </div>
        )}
      </div>

      {/* 내부 메모 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">내부 메모</h2>
        {editMode ? (
          <textarea
            value={formData.internalNote}
            onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="내부 메모를 입력하세요..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.internalNote || '내부 메모 없음'}
          </div>
        )}
      </div>
    </div>
  );
}
