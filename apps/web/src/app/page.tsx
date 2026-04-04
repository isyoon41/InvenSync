import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LogoutButton } from '@/components/layout/logout-button';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      {/* ── Header ────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link href="/">
            <img src="/logo.png" alt="InvenSync" className="h-9 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {session ? (
              <LogoutButton />
            ) : (
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-150">
                로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────── */}
        <section className="relative overflow-hidden bg-white" style={{ minHeight: '88vh' }}>
          {/* 배경 장식 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-60 -right-60 w-[700px] h-[700px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 65%)' }}
            />
            <div
              className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,121,20,0.06) 0%, transparent 65%)' }}
            />
            {/* 그리드 패턴 */}
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
              }}
            />
          </div>

          <div
            className="relative max-w-7xl mx-auto px-6 lg:px-8 flex flex-col justify-center"
            style={{ minHeight: '88vh' }}
          >
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border"
                style={{ backgroundColor: 'rgba(255,121,20,0.08)', color: '#ff7914', borderColor: 'rgba(255,121,20,0.25)' }}>
                ✦ 변리사 전용 AI 업무 플랫폼
              </div>

              {/* Heading */}
              <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
                상표 검토,<br />
                <span style={{ color: '#ff7914' }}>AI</span>가<br />
                준비합니다.
              </h1>

              {/* Sub */}
              <p className="text-lg lg:text-xl text-slate-500 mb-10" style={{ lineHeight: '1.8' }}>
                의뢰 접수부터 지정상품 설계, 유사상표 검색, 검토 리포트 생성까지
                <br className="hidden lg:block" />
                반복 업무를 자동화하여 변리사의 핵심 판단에 집중할 수 있도록 합니다.
              </p>

              {/* CTA */}
              <div className="flex flex-wrap gap-4">
                <Link
                  href={session ? '/inquiries' : '/login'}
                  className="px-8 py-4 text-base font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] shadow-sm"
                  style={{ backgroundColor: '#ff7914' }}
                >
                  {session ? '접수함 바로가기 →' : '시작하기 →'}
                </Link>
                <Link
                  href="/inquiries/new"
                  className="btn-secondary px-8 py-4 text-base"
                >
                  새 의뢰 등록
                </Link>
              </div>
            </div>

            {/* 플로팅 스탯 카드 */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4">
              {[
                { label: '1차 검토 준비 시간', value: '−60%', sub: 'AI 자동화' },
                { label: '지정상품 후보 생성', value: '< 30초', sub: 'Gemini 기반' },
                { label: 'KIPRIS 검색 자동화', value: '100%', sub: '실시간 연동' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl border border-slate-200 px-5 py-4 w-52 shadow-md"
                >
                  <div className="text-2xl font-bold" style={{ color: '#ff7914' }}>{stat.value}</div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">{stat.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 스크롤 인디케이터 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-xs tracking-widest uppercase text-slate-400">Scroll</span>
            <div className="w-px h-12 bg-slate-200" />
          </div>
        </section>

        {/* ── 워크플로우 ────────────────────────────── */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#ff7914' }}>
                WORKFLOW
              </p>
              <h2 className="text-4xl font-bold text-slate-900">
                의뢰 접수부터 고객 회신까지
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                6단계 자동화 파이프라인으로 검토 초안을 완성합니다
              </p>
            </div>

            <div className="relative">
              <div className="absolute top-10 left-0 right-0 h-px bg-slate-200 hidden lg:block" />
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 relative">
                {[
                  { step: '01', icon: '📥', label: '접수',      desc: '이메일·직접 입력' },
                  { step: '02', icon: '🔄', label: '정규화',    desc: 'AI 상표명 추출' },
                  { step: '03', icon: '🎯', label: '지정상품',  desc: '류·유사군 추천' },
                  { step: '04', icon: '🔎', label: '유사검색',  desc: 'KIPRIS 자동 검색' },
                  { step: '05', icon: '📋', label: '검토 리포트', desc: '위험도 자동 분석' },
                  { step: '06', icon: '📤', label: '회신 초안', desc: '고객 발송 준비' },
                ].map((item, idx) => (
                  <div key={item.step} className="flex flex-col items-center text-center">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl mb-4 relative z-10 shadow-sm"
                      style={{
                        backgroundColor: idx === 0 ? '#ff7914' : '#ffffff',
                        border: idx === 0 ? 'none' : '2px solid #e2e8f0',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#ff7914' }}>
                      {item.step}
                    </div>
                    <div className="text-sm font-bold mb-1 text-slate-800">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 주요 기능 ──────────────────────────────── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#ff7914' }}>
                CAPABILITIES
              </p>
              <h2 className="text-4xl font-bold text-slate-900">주요 기능</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '🤖', title: '자동 정규화',    tag: 'Gemini AI',     desc: '이메일·문서에서 상표명과 지정상품을 AI가 자동으로 추출·정규화합니다.' },
                { icon: '📌', title: '지정상품 설계',  tag: 'NICE 분류 기준', desc: '상품명으로부터 류(Class)·지정상품·유사군 코드를 자동으로 추천합니다.' },
                { icon: '🔍', title: '유사상표 검색',  tag: 'KIPRIS 연동',   desc: 'KIPRIS 데이터베이스를 실시간으로 검색하고 유사도를 자동 분석합니다.' },
                { icon: '⚠️', title: '위험도 분석',    tag: 'AI 리포트',     desc: '선등록 상표와의 충돌 가능성을 HIGH / MEDIUM / LOW로 자동 평가합니다.' },
                { icon: '✉️', title: '고객 회신 초안', tag: '자동 생성',     desc: '검토 결과를 바탕으로 즉시 발송 가능한 고객 회신 초안을 자동 작성합니다.' },
                { icon: '✅', title: '팀 승인 워크플로우', tag: '멀티 사용자', desc: '담당자 → 검토자 → 승인의 다단계 워크플로우로 품질을 보장합니다.' },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
                >
                  <div className="text-3xl mb-4">{feat.icon}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{feat.title}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: 'rgba(255,121,20,0.10)', color: '#ff7914' }}
                    >
                      {feat.tag}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 업무 효율 (브랜드 블루) ─────────────────── */}
        <section className="py-24 bg-blue-600">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-3 text-blue-200">
                  PROFESSIONALS
                </p>
                <h2 className="text-4xl font-bold text-white mb-6">
                  변리사의 시간을<br />핵심 업무에 집중시킵니다
                </h2>
                <p className="text-lg text-blue-100 mb-8" style={{ lineHeight: '1.8' }}>
                  반복적인 데이터 수집·정리 업무를 AI에 위임하고,
                  법적 판단과 고객 전략 수립에 집중하세요.
                  특허법인 인벤싱크의 실무 노하우가 설계에 반영되어 있습니다.
                </p>
                <Link
                  href={session ? '/inquiries' : '/login'}
                  className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-blue-600 bg-white rounded-lg transition-all hover:shadow-md hover:scale-[1.02]"
                >
                  지금 시작하기 →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '60%',    label: '1차 검토 준비 시간 단축' },
                  { value: '< 30초', label: '지정상품 후보 생성 속도' },
                  { value: '100%',   label: '유사상표 검색 자동화율' },
                  { value: '3단계',  label: '승인 워크플로우' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-6 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
                  >
                    <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-sm text-blue-100">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────── */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#ff7914' }}>
              GET STARTED
            </p>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              오늘부터 상표 검토를<br />더 빠르게
            </h2>
            <p className="text-lg text-slate-500 mb-10">
              의뢰를 등록하고 AI가 검토 초안을 준비하는 동안<br />
              다른 고부가 업무에 집중하세요.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={session ? '/inquiries/new' : '/login'}
                className="px-8 py-4 text-base font-semibold text-white rounded-lg transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: '#ff7914' }}
              >
                새 의뢰 등록 →
              </Link>
              <Link
                href={session ? '/inquiries' : '/login'}
                className="btn-secondary px-8 py-4 text-base"
              >
                접수함 보기
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="mb-3">
                <img
                  src="/logo.png"
                  alt="InvenSync"
                  className="h-7 w-auto object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <p className="text-sm text-slate-400">
                변리사를 위한 상표 검토 자동화 플랫폼
              </p>
            </div>
            <div className="flex gap-8 text-sm text-slate-400">
              <Link href="/inquiries" className="hover:text-white transition-colors duration-150">접수함</Link>
              <Link href="/review" className="hover:text-white transition-colors duration-150">검토 리포트</Link>
              <a href="http://invensync.kr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-150">
                특허법인 인벤싱크 ↗
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
            © 특허법인 인벤싱크. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
