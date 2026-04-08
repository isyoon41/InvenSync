'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ReviewReport } from '@ip-review/domain';

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  high:    { label: '위험',   className: 'badge-red' },
  medium:  { label: '주의',   className: 'badge-amber' },
  low:     { label: '안전',   className: 'badge-green' },
  unknown: { label: '미확인', className: 'badge-gray' },
};

function detectRiskLevel(riskNote?: string | null): string {
  if (!riskNote) return 'unknown';
  const n = riskNote.toLowerCase();
  if (n.includes('high') || n.includes('높음')) return 'high';
  if (n.includes('medium') || n.includes('중간')) return 'medium';
  if (n.includes('low') || n.includes('낮음')) return 'low';
  return 'unknown';
}

export default function ReviewPage() {
  const { data: session } = useSession();
  const [pendingReports, setPendingReports] = useState<ReviewReport[]>([]);
  const [approvedReports, setApprovedReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!session?.user?.firmId) { setLoading(false); return; }
    const firmId = session.user.firmId;

    const fetchAll = async () => {
      try {
        const [pendingRes, approvedRes] = await Promise.all([
          fetch(`/api/review-reports?firmId=${encodeURIComponent(firmId)}&pendingApproval=true`),
          fetch(`/api/review-reports?firmId=${encodeURIComponent(firmId)}&since=2024-01-01`),
        ]);
        const [pendingData, approvedData] = await Promise.all([
          pendingRes.json(),
          approvedRes.json(),
        ]);
        setPendingReports(pendingData.items || []);
        setApprovedReports(approvedData.items || []);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [session?.user?.firmId]);

  // 탭 전환 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
    setConfirmDelete(false);
  }, [filter]);

  const displayReports = filter === 'pending' ? pendingReports : approvedReports;
  const totalCount = pendingReports.length + approvedReports.length;

  const allSelected = displayReports.length > 0 && selectedIds.size === displayReports.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayReports.map((r) => r.id)));
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
          fetch(`/api/review-reports/${id}`, { method: 'DELETE' })
        )
      );
      const remove = (list: ReviewReport[]) => list.filter((r) => !selectedIds.has(r.id));
      if (filter === 'pending') {
        setPendingReports((prev) => remove(prev));
      } else {
        setApprovedReports((prev) => remove(prev));
      }
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Header
        firmName={session?.user?.firmId || 'IP Review Desk'}
        userName={session?.user?.name || '사용자'}
        userRole={session?.user?.role || 'reviewer'}
        userDepartment={session?.user?.department || undefined}
      />

      <main className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">답변서 작성</h1>
            <p className="page-description">상표 출원 검토 의견서와 고객 회신 메일 초안을 검토하고 승인합니다</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <div className="stat-card-value text-amber-600">{pendingReports.length}</div>
            <div className="stat-card-label">승인 대기</div>
            <div className="text-xs text-slate-400 mt-0.5">검토가 필요한 답변서</div>
            <div className="stat-card-accent bg-amber-400" />
          </div>
          <div className="stat-card">
            <div className="stat-card-value text-emerald-600">{approvedReports.length}</div>
            <div className="stat-card-label">승인 완료</div>
            <div className="text-xs text-slate-400 mt-0.5">처리 완료된 답변서</div>
            <div className="stat-card-accent bg-emerald-500" />
          </div>
          <div className="stat-card">
            <div className="stat-card-value text-blue-600">{totalCount}</div>
            <div className="stat-card-label">전체 답변서</div>
            <div className="text-xs text-slate-400 mt-0.5">누적 검토 의견서 수</div>
            <div className="stat-card-accent bg-blue-500" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {([
            { key: 'pending',  label: '승인 대기', count: pendingReports.length },
            { key: 'approved', label: '승인 완료', count: approvedReports.length },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                filter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold leading-none ${
                filter === f.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {f.count}
              </span>
            </button>
          ))}

          {/* 선택 삭제 버튼 */}
          {someSelected && (
            <div className="ml-auto flex items-center gap-2">
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
              {confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  취소
                </button>
              )}
            </div>
          )}
        </div>

        {/* Report Table */}
        <div className="table-container">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                불러오는 중...
              </div>
            </div>
          ) : displayReports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M9 12h2m-1-1v-4m7.5 2.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">
                {filter === 'pending' ? '승인 대기 중인' : '승인 완료된'} 답변서가 없습니다
              </p>
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
                    <th className="table-header-cell">상표명</th>
                    <th className="table-header-cell">위험도</th>
                    <th className="table-header-cell">상태</th>
                    <th className="table-header-cell">등록일</th>
                    <th className="table-header-cell">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReports.map((report) => {
                    const risk = RISK_CONFIG[detectRiskLevel(report.riskNote)];
                    const isSelected = selectedIds.has(report.id);

                    return (
                      <tr
                        key={report.id}
                        className={`table-row ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="table-cell w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(report.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="table-cell">
                          <div className="text-sm font-semibold text-slate-900">
                            {(report as any).inquiry?.proposedMarkName || (
                              <span className="text-slate-400 font-normal">상표명 미설정</span>
                            )}
                          </div>
                          {(report as any).inquiry?.title && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                              {(report as any).inquiry.title}
                            </div>
                          )}
                        </td>
                        <td className="table-cell">
                          <span className={risk.className}>{risk.label}</span>
                        </td>
                        <td className="table-cell">
                          <span className={report.approvedAt ? 'badge-emerald' : 'badge-amber'}>
                            {report.approvedAt ? '승인 완료' : '승인 대기'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm text-slate-500">
                            {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </td>
                        <td className="table-cell">
                          <Link
                            href={`/review/${report.id}`}
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
      </main>
    </>
  );
}
