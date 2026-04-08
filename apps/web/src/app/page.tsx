import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HomeLoginForm } from '@/components/auth/home-login-form';

const workflowItems = [
  '요청 내용에서 상표명, 상품·서비스, 검토 포인트 추출',
  'KIPRIS 근거 기반 지정상품·유사군 코드 설계',
  '유사상표 검색 결과를 바탕으로 등록가능성·위험도 분석',
  '상표 출원 검토 의견서와 고객 회신 메일 초안 생성',
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-white px-10 py-8 lg:flex lg:flex-col lg:justify-between">
          <div
            className="absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
              backgroundSize: '54px 54px',
            }}
          />
          <div className="absolute inset-y-0 right-0 w-px bg-slate-200" />

          <div className="relative flex items-center justify-between">
            <Link href="/" className="inline-flex items-center">
              <img
                src="/logo.png"
                alt="InvenSync"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <a
              href="http://invensync.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-slate-500 transition hover:text-blue-600"
            >
              특허법인 인벤싱크
            </a>
          </div>

          <div className="relative max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-600">
              InvenSync Patent Law Firm
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight text-slate-950">
              상표 검토 답변서 초안을
              <span className="block text-blue-600">체계적으로 준비합니다</span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-600">
              고객의 상표 검토 요청을 접수하면 지정상품 설계, KIPRIS 유사상표 검색,
              등록가능성 분석, 고객 회신 메일 초안까지 한 흐름으로 정리합니다.
            </p>

            <div className="mt-10 space-y-3">
              {workflowItems.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between text-xs text-slate-400">
            <span>Trademark review workflow platform</span>
            <span>© InvenSync Patent Law Firm</span>
          </div>
        </section>

        <section className="flex h-full flex-col bg-slate-50 px-6 py-6 text-slate-950 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="lg:hidden">
              <img src="/logo.png" alt="InvenSync" className="h-8 w-auto object-contain" />
            </Link>
            <Link
              href={session ? '/inquiries' : '/login'}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              {session ? '워크플로우로 이동' : '로그인 페이지'}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md">
              <div className="mb-7 lg:hidden">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                  InvenSync Patent Law Firm
                </p>
                <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
                  상표 검토 답변서 초안을 체계적으로 준비합니다
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  지정상품 설계부터 KIPRIS 검색, 위험도 분석, 고객 회신 초안까지 한 번에 진행합니다.
                </p>
              </div>

              <HomeLoginForm
                isAuthenticated={Boolean(session)}
                userName={session?.user?.name}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
