'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ReviewReport } from '@ip-review/domain';

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  high:    { label: '?ÑÌóò',   className: 'badge-red' },
  medium:  { label: 'Ï£ºÏùò',   className: 'badge-amber' },
  low:     { label: '?àÏ†Ñ',   className: 'badge-green' },
  unknown: { label: 'ÎØ∏Ìôï??, className: 'badge-gray' },
};

function detectRiskLevel(riskNote?: string | null): string {
  if (!riskNote) return 'unknown';
  const n = riskNote.toLowerCase();
  if (n.includes('high') || n.includes('?íÏùå')) return 'high';
  if (n.includes('medium') || n.includes('Ï§ëÍ∞Ñ')) return 'medium';
  if (n.includes('low') || n.includes('??ùå')) return 'low';
  return 'unknown';
}

export default function ReviewPage() {
  const { data: session } = useSession();
  const [pendingReports, setPendingReports] = useState<ReviewReport[]>([]);
  const [approvedReports, setApprovedReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');

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

  const displayReports = filter === 'pending' ? pendingReports : approvedReports;
  const totalCount = pendingReports.length + approvedReports.length;

  return (
    <>
      <Header
        firmName={session?.user?.firmName || session?.user?.firmId || ""}
        userName={session?.user?.name || '?¨Ïö©??}
        userRole={session?.user?.role || 'reviewer'}
        userDepartment={session?.user?.department || undefined}
      />

      <main className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Í≤Ä??Î¶¨Ìè¨??/h1>
            <p className="page-description">AI Î∂ÑÏÑù Î¶¨Ìè¨?∏Î? Í≤Ä?†ÌïòÍ≥?Í≥†Í∞ù ?åÏã†???πÏù∏?©Îãà??/p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <div className="stat-card-value text-amber-600">{pendingReports.length}</div>
            <div className="stat-card-label">?πÏù∏ ?ÄÍ∏?/div>
            <div className="text-xs text-slate-400 mt-0.5">Í≤Ä?†Í? ?ÑÏöî??Î¶¨Ìè¨??/div>
            <div className="stat-card-accent bg-amber-400" />
          </div>
          <div className="stat-card">
            <div className="stat-card-value text-emerald-600">{approvedReports.length}</div>
            <div className="stat-card-label">?πÏù∏ ?ÑÎ£å</div>
            <div className="text-xs text-slate-400 mt-0.5">Ï≤òÎ¶¨ ?ÑÎ£å??Î¶¨Ìè¨??/div>
            <div className="stat-card-accent bg-emerald-500" />
          </div>
          <div className="stat-card">
            <div className="stat-card-value text-blue-600">{totalCount}</div>
            <div className="stat-card-label">?ÑÏ≤¥ Î¶¨Ìè¨??/div>
            <div className="text-xs text-slate-400 mt-0.5">?ÑÏ†Å Í≤Ä??Î¶¨Ìè¨????/div>
            <div className="stat-card-accent bg-blue-500" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'pending',  label: '?πÏù∏ ?ÄÍ∏?, count: pendingReports.length },
            { key: 'approved', label: '?πÏù∏ ?ÑÎ£å', count: approvedReports.length },
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
        </div>

        {/* Report Table */}
        <div className="table-container">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Î∂àÎü¨?§Îäî Ï§?..
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
                {filter === 'pending' ? '?πÏù∏ ?ÄÍ∏?Ï§ëÏù∏' : '?πÏù∏ ?ÑÎ£å??} Î¶¨Ìè¨?∏Í? ?ÜÏäµ?àÎã§
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="table-header-cell">?ÅÌëúÎ™?/th>
                    <th className="table-header-cell">?ÑÌóò??/th>
                    <th className="table-header-cell">?ÅÌÉú</th>
                    <th className="table-header-cell">?±Î°ù??/th>
                    <th className="table-header-cell">?ëÏóÖ</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReports.map((report) => {
                    const risk = RISK_CONFIG[detectRiskLevel(report.riskNote)];

                    return (
                      <tr key={report.id} className="table-row">
                        <td className="table-cell">
                          <div className="text-sm font-semibold text-slate-900">
                            {(report as any).inquiry?.proposedMarkName || (
                              <span className="text-slate-400 font-normal">?ÅÌëúÎ™?ÎØ∏ÏÑ§??/span>
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
                            {report.approvedAt ? '?πÏù∏ ?ÑÎ£å' : '?πÏù∏ ?ÄÍ∏?}
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
                            Î≥¥Í∏∞ ??                          </Link>
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
