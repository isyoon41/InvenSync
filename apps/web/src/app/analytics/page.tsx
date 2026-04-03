import React from 'react';
import { Header } from '@/components';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface InquirySummary {
  total: number;
  byStatus: Record<string, number>;
}

interface ReportSummary {
  total: number;
  pending: number;
  approved: number;
}

async function getInquirySummary(firmId: string): Promise<InquirySummary> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/inquiries?firmId=${encodeURIComponent(firmId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return { total: 0, byStatus: {} };
    const data = await res.json();
    const items: { status: string }[] = data.items || [];
    const byStatus: Record<string, number> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }
    return { total: items.length, byStatus };
  } catch {
    return { total: 0, byStatus: {} };
  }
}

async function getReportSummary(firmId: string): Promise<ReportSummary> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const [pendingRes, allRes] = await Promise.all([
      fetch(`${baseUrl}/api/review-reports?firmId=${encodeURIComponent(firmId)}&pendingApproval=true`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/review-reports?firmId=${encodeURIComponent(firmId)}&since=2024-01-01`, { cache: 'no-store' }),
    ]);
    const [pendingData, allData] = await Promise.all([pendingRes.json(), allRes.json()]);
    const pending = (pendingData.items || []).length;
    const total = (allData.items || []).length;
    return { total: total + pending, pending, approved: total };
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

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.firmId) redirect('/login');

  const firmId = session.user.firmId;
  const [inquirySummary, reportSummary] = await Promise.all([
    getInquirySummary(firmId),
    getReportSummary(firmId),
  ]);

  const totalInquiries = inquirySummary.total;
  const inProgress = (inquirySummary.byStatus['parsed'] || 0) +
                     (inquirySummary.byStatus['candidate_ready'] || 0) +
                     (inquirySummary.byStatus['searched'] || 0);

  // 워크플로우 진행률 계산 (완료 기준)
  const completionRate = totalInquiries > 0
    ? Math.round(((inquirySummary.byStatus['approved'] || 0) + (inquirySummary.byStatus['exported'] || 0)) / totalInquiries * 100)
    : 0;

  return (
    <>
      <Header
        firmName={session.user.firmId}
        userName={session.user.name || '사용자'}
        userRole={session.user.role || 'operator'}
      />

      <main className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">통계 및 분석</h1>
            <p className="page-description">상표 검토 업무 처리 현황과 KIPRIS 사용량을 확인합니다</p>
          </div>
        </div>

        {/* 처리 통계 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-700">처리 통계</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: '전체 의뢰',   value: totalInquiries,        accent: 'bg-blue-500',    desc: '누적 등록 건수' },
              { label: '진행 중',     value: inProgress,            accent: 'bg-amber-400',   desc: '처리 중인 의뢰' },
              { label: '리포트 생성', value: reportSummary.total,   accent: 'bg-purple-500',  desc: '생성된 검토 리포트' },
              { label: '승인 완료',   value: reportSummary.approved, accent: 'bg-emerald-500', desc: '승인 처리된 리포트' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-value">{s.value}</div>
                <div className="stat-card-label">{s.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                <div className={`stat-card-accent ${s.accent}`} />
              </div>
            ))}
          </div>

          {/* 상태별 분포 */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-5">의뢰 단계별 현황</h3>
            {totalInquiries === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-400">등록된 의뢰가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {STATUS_ORDER.map((status) => {
                  const count = inquirySummary.byStatus[status] || 0;
                  const pct = totalInquiries > 0 ? Math.round(count / totalInquiries * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-4">
                      <div className="w-28 text-xs font-medium text-slate-600 flex-shrink-0 text-right">
                        {STATUS_LABELS[status]}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${STATUS_COLORS[status] || 'bg-slate-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-14 flex-shrink-0 flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800">{count}</span>
                        <span className="text-xs text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 전체 완료율 */}
            {totalInquiries > 0 && (
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
        </section>

        {/* KIPRIS 사용 현황 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-700">KIPRIS 사용 현황</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: '월 무료 한도', value: '1,000건', accent: 'bg-slate-400', desc: 'KIPRIS Open API 기준' },
              { label: '24시간 캐시', value: '적용 중', accent: 'bg-blue-500', desc: '중복 호출 최소화' },
              { label: '검색 완료 건수', value: `${inquirySummary.byStatus['searched'] || 0}건`, accent: 'bg-amber-400', desc: '실제 API 호출 건수' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-value text-lg">{s.value}</div>
                <div className="stat-card-label">{s.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                <div className={`stat-card-accent ${s.accent}`} />
              </div>
            ))}
          </div>

          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2563eb" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="8"/>
                  <path d="M10 6v4l3 3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">KIPRIS API 사용 안내</h3>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    월 1,000건 무료 제한 — 24시간 인메모리 캐시로 중복 호출을 방지합니다
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    상표명·지정상품 후보별 최대 5건 검색, 유사군 코드 기반 필터링 적용
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    현재 모드: <span className="font-semibold text-blue-600">KIPRIS 실제 연동</span> (TRADEMARK_PROVIDER_MODE=kipris)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 승인 현황 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-700">리포트 승인 현황</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="card p-6">
            {reportSummary.total === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-400">생성된 검토 리포트가 없습니다</p>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                {/* Donut chart (CSS) */}
                <div className="relative flex-shrink-0">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                    {reportSummary.total > 0 && (
                      <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="16"
                        strokeDasharray={`${(reportSummary.approved / reportSummary.total) * 251.2} 251.2`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">
                      {reportSummary.total > 0 ? Math.round(reportSummary.approved / reportSummary.total * 100) : 0}%
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
                        <span className="text-xs text-slate-600">{item.label}</span>
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
                  <div className="pt-2 text-xs text-slate-400">전체 {reportSummary.total}건</div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
