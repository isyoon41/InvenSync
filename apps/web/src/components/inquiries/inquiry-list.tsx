'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  inquiries: initialInquiries,
  loading = false,
  onRefresh,
  onSelectInquiry,
}: InquiryListProps) {
  const router = useRouter();
  const [items, setItems] = useState<Inquiry[]>(initialInquiries);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // initialInquiries가 바뀌면 items도 동기화
  React.useEffect(() => {
    setItems(initialInquiries);
    setSelectedIds(new Set());
  }, [initialInquiries]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/inquiries/${id}`, { method: 'DELETE' })
        )
      );
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

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
        <div className="flex items-center gap-3">
          {someSelected && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              }`}
            >
              {deleting ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1.5 3h9M4.5 3V2h3v1M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {confirmDelete ? `정말 삭제 (${selectedIds.size}건)` : `선택 삭제 (${selectedIds.size}건)`}
            </button>
          )}
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              취소
            </button>
          )}
          {onRefresh && !someSelected && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 transition-colors duration-150"
            >
              새로 고침
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
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
                <th className="table-header-cell w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="table-header-cell">제목</th>
                <th className="table-header-cell">상표명</th>
                <th className="table-header-cell">진행 상태</th>
                <th className="table-header-cell">등록일</th>
                <th className="table-header-cell">작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inquiry) => {
                const status = STATUS_CONFIG[inquiry.status] ?? {
                  label: inquiry.status,
                  className: 'badge-gray',
                };
                const isSelected = selectedIds.has(inquiry.id);

                return (
                  <tr
                    key={inquiry.id}
                    className={`table-row cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => onSelectInquiry?.(inquiry.id)}
                  >
                    <td className="table-cell w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(inquiry.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                      />
                    </td>
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
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/inquiries/${inquiry.id}`}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-150"
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
