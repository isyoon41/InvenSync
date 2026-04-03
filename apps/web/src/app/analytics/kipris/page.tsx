import React from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getSearchedCount(firmId: string): Promise<number> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/inquiries?firmId=${encodeURIComponent(firmId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const items: { status: string }[] = data.items || [];
    return items.filter((i) =>
      ['searched', 'reviewed', 'approved', 'exported'].includes(i.status)
    ).length;
  } catch {
    return 0;
  }
}

const SEARCH_MODES = [
  { mode: 'exact_mark',         label: '정확 상표명 검색',   desc: '상표명 완전 일치 검색 (기본)' },
  { mode: 'similarity_group',   label: '유사군 코드 검색',   desc: '유사군 코드 기반 관련 상표 검색' },
  { mode: 'designated_goods',   label: '지정상품 키워드 검색', desc: '상품명 키워드로 유사 상표 검색' },
];

export default async function KiprisPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.firmId) redirect('/login');

  const searchedCount = await getSearchedCount(session.user.firmId);
  const providerMode = process.env.TRADEMARK_PROVIDER_MODE || 'mock';
  const isLive = providerMode === 'kipris';

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
            <div className="flex items-center gap-2 mb-1">
              <Link href="/analytics/stats" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">통계</Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-blue-600">KIPRIS 사용 현황</span>
            </div>
            <h1 className="page-title">KIPRIS 사용 현황</h1>
            <p className="page-description">KIPRIS Open API 사용량과 연동 상태를 확인합니다</p>
          </div>
          <Link href="/analytics/stats" className="btn-secondary text-sm">
            ← 처리 통계
          </Link>
        </div>

        {/* 연동 상태 배너 */}
        <div className={`rounded-xl border p-5 mb-8 flex items-start gap-4 ${
          isLive
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isLive ? 'bg-emerald-100' : 'bg-amber-100'
          }`}>
            {isLive ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#059669" strokeWidth="2">
                <path d="M9 1a8 8 0 100 16A8 8 0 009 1zM5.5 9l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#d97706" strokeWidth="2">
                <path d="M9 1a8 8 0 100 16A8 8 0 009 1zM9 5v5M9 13h.01" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div>
            <div className={`text-sm font-bold mb-1 ${isLive ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isLive ? 'KIPRIS 실제 연동 중' : 'Mock 모드 (개발 환경)'}
            </div>
            <p className={`text-xs leading-relaxed ${isLive ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isLive
                ? 'TRADEMARK_PROVIDER_MODE=kipris — 실제 KIPRIS Open API에 연결되어 있습니다. 월 1,000건 무료 한도 내에서 사용 중입니다.'
                : 'TRADEMARK_PROVIDER_MODE=mock — 개발용 Mock 데이터를 사용 중입니다. 실제 API 호출이 발생하지 않습니다.'}
            </p>
          </div>
        </div>

        {/* 사용량 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: '월 무료 한도',
              value: '1,000건',
              accent: 'bg-slate-400',
              desc: 'KIPRIS Open API 기준',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#64748b" strokeWidth="1.5">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zM10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              label: '24시간 캐시',
              value: '적용 중',
              accent: 'bg-blue-500',
              desc: '동일 검색어 중복 호출 차단',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2563eb" strokeWidth="1.5">
                  <path d="M4 4h12v4l-6 4-6-4V4zM4 12v4h12v-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              label: '검색 완료 건수',
              value: `${searchedCount}건`,
              accent: 'bg-amber-400',
              desc: '실제 API 호출 추정 건수',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#d97706" strokeWidth="1.5">
                  <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3" strokeLinecap="round"/>
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
                  {s.icon}
                </div>
              </div>
              <div className="stat-card-value text-xl">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
              <div className={`stat-card-accent ${s.accent}`} />
            </div>
          ))}
        </div>

        {/* 검색 모드 안내 */}
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5">지원 검색 모드</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SEARCH_MODES.map((mode) => (
              <div
                key={mode.mode}
                className="flex flex-col p-4 rounded-lg border border-slate-100 bg-slate-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">{mode.label}</span>
                </div>
                <div className="w-8 h-px bg-slate-200 mb-2" />
                <p className="text-xs text-slate-500 leading-relaxed">{mode.desc}</p>
                <div className="mt-3">
                  <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded">
                    {mode.mode}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 캐시 및 API 정책 */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">API 사용 정책 안내</h3>
          <div className="space-y-3">
            {[
              { icon: '🔒', title: '24시간 인메모리 캐시',  desc: '동일 검색어·조건의 결과를 24시간 동안 캐시하여 KIPRIS API 중복 호출을 방지합니다.' },
              { icon: '📦', title: '후보 수 제한',           desc: '의뢰 1건당 최대 5개 지정상품 후보에 대해 검색을 실행하여 월 사용량을 보호합니다.' },
              { icon: '🔑', title: 'API 키 관리',            desc: 'KIPRIS_API_KEY는 Vercel 환경변수에 안전하게 저장되어 있습니다. 키는 서버에서만 사용됩니다.' },
              { icon: '⚡', title: '할당량 초과 시 동작',    desc: '월 1,000건 한도 초과 시 캐시된 결과를 우선 반환하며, 신규 검색은 Mock 데이터로 대체됩니다.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-0.5">{item.title}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
