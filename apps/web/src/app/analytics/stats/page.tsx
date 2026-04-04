import React from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getInquiries(firmId: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/inquiries?firmId=${encodeURIComponent(firmId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

async function getReportSummary(firmId: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const [pendingRes, allRes] = await Promise.all([
      fetch(`${baseUrl}/api/review-reports?firmId=${encodeURIComponent(firmId)}&pendingApproval=true`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/review-reports?firmId=${encodeURIComponent(firmId)}&since=2024-01-01`, { cache: 'no-store' }),
    ]);
    const [pendingData, allData] = await Promise.all([pendingRes.json(), allRes.json()]);
    const pending = (pendingData.items || []).length;
    const approved = (allData.items || []).length;
    return { total: pending + approved, pending, approved };
  } catch {
    return { total: 0, pending: 0, approved: 0 };
  }
}

const STATUS_LABELS: Record<string, string> = {
  new:             '신규 접수',
  parsed:          '정규화 완료',
  candidate_ready: '지정상품 완료',
  searched:        '검색 완료',
  reviewed:        '검토 완료',
  approved:        '승인됨',
  exported:        '내보내기 완료',
};

const STATUS_COLORS: Record<string, string> = {
  new:             'bg-slate-400',
  parsed:          'bg-blue-500',
  candidate_ready: 'bg-purple-500',
  searched:        'bg-amber-400',
  reviewed:        'bg-green-500',
  approved:        'bg-emerald-500',
  exported:        'bg-slate-300',
};

const STATUS_ORDER = ['new', 'parsed', 'candidate_ready', 'searched', 'reviewed', 'approved', 'exported'];

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.firmId) redirect('/login');

  const firmId = session.user.firmId;
  const [items, reportSummary] = await Promise.all([
    getInquiries(firmId),
    getReportSummary(firmId),
  ]);

  const total = items.length;
  const byStatus: Record<string, number> = {};
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  }

  const inProgress = (byStatus['parsed'] || 0) + (byStatus['candidate_ready'] || 0) + (byStatus['searched'] || 0);
  const completionRate = total > 0
    ? Math.round(((byStatus['approved'] || 0) + (byStatus['exported'] || 0)) / total * 100)
    : 0;

  return (
    <>
      <Header
        firmName={session.user.firmName || session.user.firmId}
        userName={session.user.name || '사용자'}
        userRole={session.user.role || 'operator'}
        userDepartment={session.user.department || undefined}
      />

      <main className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/analytics/kipris" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">통계</Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-blue-600">처리 통계</span>
            </div>
            <h1 className="page-title">처리 통계</h1>
            <p className="page-description">기간별 상표 검토 처리 현황을 확인합니다</p>
          </div>
          <Link href="/analytics/kipris" className="btn-secondary text-sm">
            KIPRIS 사용 현황 →
          </Link>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '전체 의뢰',    value: total,                 accent: 'bg-blue-500',    desc: '누적 등록 건수' },
            { label: '진행 중',      value: inProgress,            accent: 'bg-amber-400',   desc: '처리 중인 의뢰' },
            { label: '리포트 생성',  value: reportSummary.total,   accent: 'bg-purple-500',  desc: '생성된 검토 리포트' },
            { label: '승인 완료',    value: reportSummary.approved, accent: 'bg-emerald-500', desc: '승인 처리된 리포트' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
              <div className={`stat-card-accent ${s.accent}`} />
            </div>
          ))}
        </div>

        {/* 단계별 현황 */}
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5">의뢰 단계별 현황</h3>
          {total === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">등록된 의뢰가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = byStatus[status] || 0;
                const pct = total > 0 ? Math.round(count / total * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className="w-28 text-xs font-medium text-slate-600 flex-shrink-0 text-right">
                      {STATUS_LABELS[status]}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${STATUS_COLORS[status] || 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-16 flex-shrink-0 flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{count}</span>
                      <span className="text-xs text-slate-400">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {total > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-500">전체 완료율</div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-emerald-600">{completionRate}%</span>
              </div>
            </div>
          )}
        </div>

        {/* 리포트 승인 현황 */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5">리포트 승인 현황</h3>
          {reportSummary.total === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">생성된 검토 리포트가 없습니다</p>
            </div>
          ) : (
            <div className="flex items-center gap-10">
              {/* 도넛 차트 */}
              <div className="relative flex-shrink-0">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <circle cx="55" cy="55" r="44" fill="none" stroke="#f1f5f9" strokeWidth="16"/>
                  <circle
                    cx="55" cy="55" r="44"
                    fill="none" stroke="#10b981" strokeWidth="16"
                    strokeDasharray={`${(reportSummary.approved / reportSummary.total) * 276.5} 276.5`}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">
                    {Math.round(reportSummary.approved / reportSummary.total * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-400">승인률</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {[
                  { label: '승인 완료', count: reportSummary.approved, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                  { label: '승인 대기', count: reportSummary.pending,  color: 'bg-amber-400',   textColor: 'text-amber-600' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-24">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-xs font-medium text-slate-600">{item.label}</span>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: reportSummary.total > 0 ? `${item.count / reportSummary.total * 100}%` : '0%' }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${item.textColor}`}>{item.count}</span>
                  </div>
                ))}
                <div className="pt-1 text-xs text-slate-400">전체 {reportSummary.total}건</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
