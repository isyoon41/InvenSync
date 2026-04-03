'use client';

import React from 'react';
import Link from 'next/link';
import type { Inquiry } from '@ip-review/domain';

export interface InquiryListProps {
  inquiries: Inquiry[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectInquiry?: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:             { label: '신규',           className: 'badge-gray' },
  parsed:          { label: '정규화 완료',    className: 'badge-blue' },
  candidate_ready: { label: '지정상품 완료',  className: 'badge-purple' },
  searched:        { label: '검색 완료',      className: 'badge-amber' },
  reviewed:        { label: '검토 완료',      className: 'badge-green' },
  approved:        { label: '승인됨',         className: 'badge-emerald' },
  exported:        { label: '내보내기 완료',  className: 'badge-gray' },
};

export function InquiryList({
  inquiries,
  loading = false,
  onRefresh,
  onSelectInquiry,
}: InquiryListProps) {
  if (loading) {
    return (
      <div className="table-container">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="skeleton h-5 w-24" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-100 flex items-center gap-6">
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="table-container">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">의뢰 목록</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 transition-colors duration-150"
          >
            새로 고침
          </button>
        )}
      </div>

      {inquiries.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h0a2 2 0 002-2M9 5a2 2 0 012-2h0a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">등록된 의뢰가 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">새 의뢰를 등록하여 시작하세요</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header-cell">제목</th>
                <th className="table-header-cell">상표명</th>
                <th className="table-header-cell">진행 상태</th>
                <th className="table-header-cell">등록일</th>
                <th className="table-header-cell">작업</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => {
                const status = STATUS_CONFIG[inquiry.status] ?? {
                  label: inquiry.status,
                  className: 'badge-gray',
                };

                return (
                  <tr
                    key={inquiry.id}
                    className="table-row cursor-pointer"
                    onClick={() => onSelectInquiry?.(inquiry.id)}
                  >
                    <td className="table-cell">
                      <div className="text-sm font-semibold text-slate-900 truncate max-w-xs">
                        {inquiry.title}
                      </div>
                      {inquiry.senderEmail && (
                        <div className="text-xs text-slate-400 mt-0.5">{inquiry.senderEmail}</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-slate-700 font-medium">
                        {inquiry.proposedMarkName || (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={status.className}>{status.label}</span>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-slate-500">
                        {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/inquiries/${inquiry.id}`}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        보기 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
