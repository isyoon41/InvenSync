import React from 'react';
import { Header, InquiryList } from '@/components';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getInquiries(firmId: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/inquiries?firmId=${encodeURIComponent(firmId)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch inquiries: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return [];
  }
}

export default async function InquiriesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.firmId) {
    redirect('/login');
  }

  const firmId = session.user.firmId;
  const inquiries = await getInquiries(firmId);

  return (
    <>
      <Header
        firmName={session.user.firmId || 'IP Review Desk'}
        userName={session.user.name || '사용자'}
        userRole={session.user.role || 'operator'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">접수함</h1>
            <p className="mt-2 text-gray-600">
              고객 상표 검토 의뢰를 관리합니다
            </p>
          </div>
          <Link
            href="/inquiries/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + 새로 등록
          </Link>
        </div>

        <div className="space-y-6">
          {/* 상태별 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: '신규', count: 5, color: 'bg-gray-100' },
              { label: '진행 중', count: 3, color: 'bg-blue-100' },
              { label: '검토 대기', count: 2, color: 'bg-yellow-100' },
              { label: '승인 완료', count: 12, color: 'bg-green-100' },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
                <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* 의뢰 목록 */}
          <InquiryList inquiries={inquiries} />
        </div>
      </main>
    </>
  );
}
