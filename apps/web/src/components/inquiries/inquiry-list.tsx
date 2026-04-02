'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Inquiry } from '@ip-review/domain';

export interface InquiryListProps {
  inquiries: Inquiry[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectInquiry?: (id: string) => void;
}

export function InquiryList({
  inquiries,
  loading = false,
  onRefresh,
  onSelectInquiry,
}: InquiryListProps) {
  const statusColors: Record<string, string> = {
    new: 'bg-gray-100 text-gray-800',
    parsed: 'bg-blue-100 text-blue-800',
    candidate_ready: 'bg-purple-100 text-purple-800',
    searched: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-green-100 text-green-800',
    approved: 'bg-emerald-100 text-emerald-800',
    exported: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    new: '신규',
    parsed: '정규화 완료',
    candidate_ready: '지정상품 완료',
    searched: '검색 완료',
    reviewed: '검토 완료',
    approved: '승인됨',
    exported: '내보내기 완료',
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">의뢰 목록</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {loading ? '불러오는 중...' : '새로 고침'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                상표명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                진행 상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inquiries.map((inquiry) => (
              <tr
                key={inquiry.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectInquiry?.(inquiry.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{inquiry.title}</div>
                  {inquiry.senderEmail && (
                    <div className="text-xs text-gray-500">{inquiry.senderEmail}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{inquiry.proposedMarkName || '—'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[inquiry.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusLabels[inquiry.status] || inquiry.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/inquiries/${inquiry.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inquiries.length === 0 && !loading && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">등록된 의뢰가 없습니다</p>
        </div>
      )}
    </div>
  );
}
