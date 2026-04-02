import React from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const firmName = session?.user?.firmId || 'IP Review Desk';
  const userName = session?.user?.name || '사용자';
  const userRole = session?.user?.role || '담당자';

  return (
    <>
      <Header firmName={firmName} userName={userName} userRole={userRole} />

      <main>
        {/* 히어로 섹션 */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <h1 className="text-5xl font-bold mb-6">
              상표 검토 업무를 자동화하세요
            </h1>
            <p className="text-xl mb-8 opacity-90">
              AI 기반 상표 분석으로 1차 검토 준비 시간 60% 단축
            </p>
            <div className="flex gap-4">
              <Link
                href="/inquiries/new"
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100"
              >
                새 의뢰 등록
              </Link>
              <Link
                href="/inquiries"
                className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                접수함 보기
              </Link>
            </div>
          </div>
        </section>

        {/* 통계 섹션 */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            업무 현황
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: '진행 중인 의뢰', value: '12', color: 'blue' },
              { label: '평균 처리 시간', value: '2.3시간', color: 'green' },
              { label: '검토 완료', value: '48건', color: 'purple' },
              { label: '절약한 시간', value: '156시간', color: 'orange' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 text-center">
                <div className={`text-4xl font-bold text-${stat.color}-600 mb-2`}>
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 기능 소개 섹션 */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              주요 기능
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: '자동 정규화',
                  description: 'AI로 상표명과 지정상품 설명을 자동으로 추출·정규화',
                  icon: '📄',
                },
                {
                  title: '지정상품 추천',
                  description: 'AI가 류(Class)·지정상품·유사군을 자동으로 추천',
                  icon: '🎯',
                },
                {
                  title: '유사상표 검색',
                  description: 'KIPRIS 데이터베이스를 검색하고 유사도를 즉시 분석',
                  icon: '🔍',
                },
                {
                  title: 'AI 검토 리포트',
                  description: '위험도 평가와 함께 검토 리포트를 자동으로 생성',
                  icon: '📊',
                },
                {
                  title: '고객 회신 초안',
                  description: '즉시 발송 가능한 고객 회신 초안 자동 작성',
                  icon: '💬',
                },
                {
                  title: '팀 협업',
                  description: '다중 사용자 승인 워크플로우로 품질 관리',
                  icon: '👥',
                },
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-lg p-8 shadow-sm hover:shadow">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              상표 검토 업무를 지금 바로 시작하세요
            </h2>
            <p className="text-gray-600 mb-6">
              의뢰를 등록하면 AI가 검토 준비를 도와드립니다
            </p>
            <Link
              href="/inquiries"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              시작하기
            </Link>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">&copy; 2024 InvenSync. All rights reserved.</p>
            <p className="text-xs mt-2">변리사를 위한 상표 검토 자동화 플랫폼</p>
          </div>
        </div>
      </footer>
    </>
  );
}
