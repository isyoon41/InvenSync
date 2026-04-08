'use client';

import React, { useState } from 'react';
import type { Inquiry } from '@ip-review/domain';

export interface InquiryDetailProps {
  inquiry: Inquiry;
  onStatusChange?: (newStatus: string) => void;
  onProcess?: () => void;
  processing?: boolean;
}

const statusLabels: Record<string, string> = {
  new: '신규',
  parsed: '정규화 완료',
  candidate_ready: '지정상품 완료',
  searched: '검색 완료',
  reviewed: '검토 완료',
  approved: '승인됨',
  exported: '내보내기 완료',
};

function attachmentList(inquiry: Inquiry) {
  const attachments = inquiry.metadata?.attachments;
  return Array.isArray(attachments)
    ? attachments.filter((attachment): attachment is Record<string, any> => (
        attachment &&
        typeof attachment === 'object' &&
        typeof attachment.fileName === 'string'
      ))
    : [];
}

function attachmentStatusLabel(status: string | undefined) {
  if (status === 'ready') return 'AI 분석 포함';
  if (status === 'too_large') return '용량 초과';
  if (status === 'unsupported') return '형식 미지원';
  if (status === 'failed') return '추출 실패';
  return '상태 미확인';
}

export function InquiryDetail({
  inquiry,
  onStatusChange,
  onProcess,
  processing = false,
}: InquiryDetailProps) {
  const attachments = attachmentList(inquiry);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{inquiry.title}</h1>
            <p className="mt-2 text-gray-600">{inquiry.subject || '제목 없음'}</p>
          </div>
          {onProcess && (
            <button
              onClick={onProcess}
              disabled={processing || inquiry.status !== 'new'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {processing ? '처리 중...' : '정규화 시작'}
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">제안 상표명</label>
            <div className="text-lg font-semibold text-gray-900">
              {inquiry.proposedMarkName || '미설정'}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">진행 상태</label>
            <div className="text-lg font-semibold text-gray-900">
              {statusLabels[inquiry.status] || inquiry.status}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">발신자</label>
            <div className="text-gray-700">{inquiry.senderEmail || '미확인'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">접수일시</label>
            <div className="text-gray-700">
              {new Date(inquiry.createdAt).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">첨부파일 분석 상태</h2>
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={`${attachment.fileName}-${index}`}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {attachment.mimeType || 'mime 미확인'} · {attachment.sizeBytes ? `${Math.round(attachment.sizeBytes / 1024)}KB` : '크기 미확인'}
                  </p>
                  {attachment.error && (
                    <p className="mt-1 text-xs text-amber-700">{attachment.error}</p>
                  )}
                </div>
                <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                  attachment.extractionStatus === 'ready'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {attachmentStatusLabel(attachment.extractionStatus)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            분석 포함 파일은 정규화와 검토 의견서 생성 시 AI 입력으로 함께 전달됩니다.
          </p>
        </div>
      )}

      {/* 의뢰 내용 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">의뢰 내용</h2>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {inquiry.rawText}
          </pre>
        </div>
      </div>

      {/* HTML 미리보기 */}
      {inquiry.rawHtml && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">HTML 미리보기</h2>
          <div
            className="bg-white border border-gray-200 rounded p-4"
            dangerouslySetInnerHTML={{ __html: inquiry.rawHtml }}
          />
        </div>
      )}

      {/* 메타데이터 - 내부용, 사용자에게 미노출 */}
    </div>
  );
}
