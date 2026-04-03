import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      {/* 헤더 */}
      <header style={{ backgroundColor: '#16171d' }} className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/">
            <img
              src="http://invensync.kr/wp-content/uploads/2018/08/invensync_logo.png"
              alt="InvenSync"
              className="h-8 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/inquiries" className="text-sm font-medium text-gray-400 hover:text-white tracking-widest uppercase transition-colors">
              접수함
            </Link>
            <Link href="/review" className="text-sm font-medium text-gray-400 hover:text-white tracking-widest uppercase transition-colors">
              검토 리포트
            </Link>
            {session ? (
              <Link
                href="/inquiries"
                className="px-5 py-2 text-sm font-semibold text-white rounded transition-colors"
                style={{ backgroundColor: '#ff7914' }}
              >
                대시보드 →
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-semibold text-white rounded transition-colors"
                style={{ backgroundColor: '#ff7914' }}
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* 히어로 섹션 */}
        <section
          className="relative overflow-hidden"
          style={{ backgroundColor: '#16171d', minHeight: '92vh' }}
        >
          {/* 배경 그리드 패턴 */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          {/* 오렌지 글로우 */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: '#ff7914' }}
          />

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 flex flex-col justify-center"
            style={{ minHeight: '92vh' }}>
            <div className="max-w-3xl">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8"
                style={{ backgroundColor: 'rgba(255,121,20,0.15)', color: '#ff7914', border: '1px solid rgba(255,121,20,0.3)' }}
              >
                ✦ 변리사 전용 AI 업무 플랫폼
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
                상표 검토,<br />
                <span style={{ color: '#ff7914' }}>AI</span>가<br />
                준비합니다.
              </h1>

              <p className="text-lg lg:text-xl mb-10" style={{ color: '#949494', lineHeight: '1.8' }}>
                의뢰 접수부터 지정상품 설계, 유사상표 검색, 검토 리포트 생성까지
                <br className="hidden lg:block" />
                반복 업무를 자동화하여 변리사의 핵심 판단에 집중할 수 있도록 합니다.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href={session ? '/inquiries' : '/login'}
                  className="px-8 py-4 text-base font-semibold text-white rounded transition-all hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: '#ff7914' }}
                >
                  {session ? '접수함 바로가기 →' : '시작하기 →'}
                </Link>
                <Link
                  href="/inquiries/new"
                  className="px-8 py-4 text-base font-semibold rounded transition-all hover:bg-white/10"
                  style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
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
                  className="px-5 py-4 rounded-lg w-52"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="text-2xl font-bold" style={{ color: '#ff7914' }}>{stat.value}</div>
                  <div className="text-sm text-white font-medium mt-0.5">{stat.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#949494' }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 스크롤 인디케이터 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-xs tracking-widest uppercase" style={{ color: '#949494' }}>Scroll</span>
            <div className="w-px h-12 opacity-30" style={{ backgroundColor: '#ff7914' }} />
          </div>
        </section>

        {/* 워크플로우 섹션 */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#ff7914' }}>
                WORKFLOW
              </p>
              <h2 className="text-4xl font-bold" style={{ color: '#16171d' }}>
                의뢰 접수부터 고객 회신까지
              </h2>
              <p className="mt-4 text-lg" style={{ color: '#949494' }}>
                6단계 자동화 파이프라인으로 검토 초안을 완성합니다
              </p>
            </div>

            <div className="relative">
              {/* 연결선 */}
              <div className="absolute top-10 left-0 right-0 h-px hidden lg:block"
                style={{ backgroundColor: '#f0f0f0' }} />

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 relative">
                {[
                  { step: '01', icon: '📥', label: '접수', desc: '이메일·직접 입력' },
                  { step: '02', icon: '🔄', label: '정규화', desc: 'AI 상표명 추출' },
                  { step: '03', icon: '🎯', label: '지정상품', desc: '류·유사군 추천' },
                  { step: '04', icon: '🔎', label: '유사검색', desc: 'KIPRIS 자동 검색' },
                  { step: '05', icon: '📋', label: '검토 리포트', desc: '위험도 자동 분석' },
                  { step: '06', icon: '📤', label: '회신 초안', desc: '고객 발송 준비' },
                ].map((item, idx) => (
                  <div key={item.step} className="flex flex-col items-center text-center">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl mb-4 relative z-10"
                      style={{
                        backgroundColor: idx === 0 ? '#ff7914' : '#f8f8f8',
                        border: idx === 0 ? 'none' : '2px solid #f0f0f0',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div className="text-xs font-bold tracking-widest uppercase mb-1"
                      style={{ color: '#ff7914' }}>{item.step}</div>
                    <div className="text-sm font-bold mb-1" style={{ color: '#16171d' }}>{item.label}</div>
                    <div className="text-xs" style={{ color: '#949494' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 기능 상세 섹션 */}
        <section className="py-24" style={{ backgroundColor: '#f8f8f8' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#ff7914' }}>
                CAPABILITIES
              </p>
              <h2 className="text-4xl font-bold" style={{ color: '#16171d' }}>
                주요 기능
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: '🤖',
                  title: '자동 정규화',
                  desc: '이메일·문서에서 상표명과 지정상품을 AI가 자동으로 추출·정규화합니다.',
                  tag: 'Gemini AI',
                },
                {
                  icon: '📌',
                  title: '지정상품 설계',
                  desc: '상품명으로부터 류(Class)·지정상품·유사군 코드를 자동으로 추천합니다.',
                  tag: 'NICE 분류 기준',
                },
                {
                  icon: '🔍',
                  title: '유사상표 검색',
                  desc: 'KIPRIS 데이터베이스를 실시간으로 검색하고 유사도를 자동 분석합니다.',
                  tag: 'KIPRIS 연동',
                },
                {
                  icon: '⚠️',
                  title: '위험도 분석',
                  desc: '선등록 상표와의 충돌 가능성을 HIGH / MEDIUM / LOW로 자동 평가합니다.',
                  tag: 'AI 리포트',
                },
                {
                  icon: '✉️',
                  title: '고객 회신 초안',
                  desc: '검토 결과를 바탕으로 즉시 발송 가능한 고객 회신 초안을 자동 작성합니다.',
                  tag: '자동 생성',
                },
                {
                  icon: '✅',
                  title: '팀 승인 워크플로우',
                  desc: '담당자 → 검토자 → 승인의 다단계 워크플로우로 품질을 보장합니다.',
                  tag: '멀티 사용자',
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="bg-white rounded-xl p-8 hover:shadow-lg transition-shadow"
                  style={{ border: '1px solid #efefef' }}
                >
                  <div className="text-3xl mb-4">{feat.icon}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-bold" style={{ color: '#16171d' }}>{feat.title}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(255,121,20,0.1)', color: '#ff7914' }}
                    >
                      {feat.tag}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#949494' }}>{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 업무 효율 섹션 */}
        <section className="py-24" style={{ backgroundColor: '#16171d' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#ff7914' }}>
                  PROFESSIONALS
                </p>
                <h2 className="text-4xl font-bold text-white mb-6">
                  변리사의 시간을<br />핵심 업무에 집중시킵니다
                </h2>
                <p className="text-lg mb-8" style={{ color: '#949494', lineHeight: '1.8' }}>
                  반복적인 데이터 수집·정리 업무를 AI에 위임하고,
                  법적 판단과 고객 전략 수립에 집중하세요.
                  특허법인 인벤싱크의 실무 노하우가 설계에 반영되어 있습니다.
                </p>
                <Link
                  href={session ? '/inquiries' : '/login'}
                  className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white rounded transition-all hover:opacity-90"
                  style={{ backgroundColor: '#ff7914' }}
                >
                  지금 시작하기 →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '60%', label: '1차 검토 준비 시간 단축' },
                  { value: '< 30초', label: '지정상품 후보 생성 속도' },
                  { value: '100%', label: '유사상표 검색 자동화율' },
                  { value: '3단계', label: '승인 워크플로우' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-6 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="text-3xl font-bold mb-2" style={{ color: '#ff7914' }}>{stat.value}</div>
                    <div className="text-sm" style={{ color: '#949494' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#ff7914' }}>
              GET STARTED
            </p>
            <h2 className="text-4xl font-bold mb-6" style={{ color: '#16171d' }}>
              오늘부터 상표 검토를<br />더 빠르게
            </h2>
            <p className="text-lg mb-10" style={{ color: '#949494' }}>
              의뢰를 등록하고 AI가 검토 초안을 준비하는 동안<br />
              다른 고부가 업무에 집중하세요.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={session ? '/inquiries/new' : '/login'}
                className="px-8 py-4 text-base font-semibold text-white rounded transition-all hover:opacity-90"
                style={{ backgroundColor: '#ff7914' }}
              >
                새 의뢰 등록 →
              </Link>
              <Link
                href={session ? '/inquiries' : '/login'}
                className="px-8 py-4 text-base font-semibold rounded transition-all"
                style={{ color: '#16171d', border: '2px solid #16171d' }}
              >
                접수함 보기
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer style={{ backgroundColor: '#16171d' }} className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="mb-2">
                <img
                  src="http://invensync.kr/wp-content/uploads/2018/08/invensync_logo.png"
                  alt="InvenSync"
                  className="h-7 w-auto object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <p className="text-sm" style={{ color: '#949494' }}>
                변리사를 위한 상표 검토 자동화 플랫폼
              </p>
            </div>
            <div className="flex gap-8 text-sm" style={{ color: '#949494' }}>
              <Link href="/inquiries" className="hover:text-white transition-colors">접수함</Link>
              <Link href="/review" className="hover:text-white transition-colors">검토 리포트</Link>
              <a href="http://invensync.kr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                특허법인 인벤싱크 ↗
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-xs" style={{ color: '#949494' }}>
            © 특허법인 인벤싱크. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
