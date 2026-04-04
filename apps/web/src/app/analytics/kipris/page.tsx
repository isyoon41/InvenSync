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
  { mode: 'exact_mark',         label: '?•í™• ?í‘œëª?ê²€??,   desc: '?í‘œëª??„ì „ ?¼ì¹˜ ê²€??(ê¸°ë³¸)' },
  { mode: 'similarity_group',   label: '? ì‚¬êµ?ì½”ë“œ ê²€??,   desc: '? ì‚¬êµ?ì½”ë“œ ê¸°ë°˜ ê´€???í‘œ ê²€?? },
  { mode: 'designated_goods',   label: 'ì§€?•ìƒ???¤ì›Œ??ê²€??, desc: '?í’ˆëª??¤ì›Œ?œë¡œ ? ì‚¬ ?í‘œ ê²€?? },
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
        firmName={session.user.firmName || session.user.firmId}
        userName={session.user.name || '?¬ìš©??}
        userRole={session.user.role || 'operator'}
        userDepartment={session.user.department || undefined}
      />

      <main className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/analytics/stats" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">?µê³„</Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-blue-600">KIPRIS ?¬ìš© ?„í™©</span>
            </div>
            <h1 className="page-title">KIPRIS ?¬ìš© ?„í™©</h1>
            <p className="page-description">KIPRIS Open API ?¬ìš©?‰ê³¼ ?°ë™ ?íƒœë¥??•ì¸?©ë‹ˆ??/p>
          </div>
          <Link href="/analytics/stats" className="btn-secondary text-sm">
            ??ì²˜ë¦¬ ?µê³„
          </Link>
        </div>

        {/* ?°ë™ ?íƒœ ë°°ë„ˆ */}
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
              {isLive ? 'KIPRIS ?¤ì œ ?°ë™ ì¤? : 'Mock ëª¨ë“œ (ê°œë°œ ?˜ê²½)'}
            </div>
            <p className={`text-xs leading-relaxed ${isLive ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isLive
                ? 'TRADEMARK_PROVIDER_MODE=kipris ???¤ì œ KIPRIS Open API???°ê²°?˜ì–´ ?ˆìŠµ?ˆë‹¤. ??1,000ê±?ë¬´ë£Œ ?œë„ ?´ì—???¬ìš© ì¤‘ì…?ˆë‹¤.'
                : 'TRADEMARK_PROVIDER_MODE=mock ??ê°œë°œ??Mock ?°ì´?°ë? ?¬ìš© ì¤‘ì…?ˆë‹¤. ?¤ì œ API ?¸ì¶œ??ë°œìƒ?˜ì? ?ŠìŠµ?ˆë‹¤.'}
            </p>
          </div>
        </div>

        {/* ?¬ìš©??ì¹´ë“œ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: '??ë¬´ë£Œ ?œë„',
              value: '1,000ê±?,
              accent: 'bg-slate-400',
              desc: 'KIPRIS Open API ê¸°ì?',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#64748b" strokeWidth="1.5">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zM10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              label: '24?œê°„ ìºì‹œ',
              value: '?ìš© ì¤?,
              accent: 'bg-blue-500',
              desc: '?™ì¼ ê²€?‰ì–´ ì¤‘ë³µ ?¸ì¶œ ì°¨ë‹¨',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2563eb" strokeWidth="1.5">
                  <path d="M4 4h12v4l-6 4-6-4V4zM4 12v4h12v-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              label: 'ê²€???„ë£Œ ê±´ìˆ˜',
              value: `${searchedCount}ê±?,
              accent: 'bg-amber-400',
              desc: '?¤ì œ API ?¸ì¶œ ì¶”ì • ê±´ìˆ˜',
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

        {/* ê²€??ëª¨ë“œ ?ˆë‚´ */}
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5">ì§€??ê²€??ëª¨ë“œ</h3>
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

        {/* ìºì‹œ ë°?API ?•ì±… */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">API ?¬ìš© ?•ì±… ?ˆë‚´</h3>
          <div className="space-y-3">
            {[
              { icon: '?”’', title: '24?œê°„ ?¸ë©”ëª¨ë¦¬ ìºì‹œ',  desc: '?™ì¼ ê²€?‰ì–´Â·ì¡°ê±´??ê²°ê³¼ë¥?24?œê°„ ?™ì•ˆ ìºì‹œ?˜ì—¬ KIPRIS API ì¤‘ë³µ ?¸ì¶œ??ë°©ì??©ë‹ˆ??' },
              { icon: '?“¦', title: '?„ë³´ ???œí•œ',           desc: '?˜ë¢° 1ê±´ë‹¹ ìµœë? 5ê°?ì§€?•ìƒ???„ë³´???€??ê²€?‰ì„ ?¤í–‰?˜ì—¬ ???¬ìš©?‰ì„ ë³´í˜¸?©ë‹ˆ??' },
              { icon: '?”‘', title: 'API ??ê´€ë¦?,            desc: 'KIPRIS_API_KEY??Vercel ?˜ê²½ë³€?˜ì— ?ˆì „?˜ê²Œ ?€?¥ë˜???ˆìŠµ?ˆë‹¤. ?¤ëŠ” ?œë²„?ì„œë§??¬ìš©?©ë‹ˆ??' },
              { icon: '??, title: '? ë‹¹??ì´ˆê³¼ ???™ì‘',    desc: '??1,000ê±??œë„ ì´ˆê³¼ ??ìºì‹œ??ê²°ê³¼ë¥??°ì„  ë°˜í™˜?˜ë©°, ? ê·œ ê²€?‰ì? Mock ?°ì´?°ë¡œ ?€ì²´ë©?ˆë‹¤.' },
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
