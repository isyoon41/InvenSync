import React from 'react';
import { Header, InquiryList } from '@/components';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Inquiry } from '@ip-review/domain';

async function getInquiries(firmId: string): Promise<Inquiry[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/inquiries?firmId=${encodeURIComponent(firmId)}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}

const STATUS_STATS = [
  {
    key: 'new',
    label: '신규 접수',
    desc: '검토 전 새 의뢰',
    accent: 'bg-slate-400',
    filter: (s: string) => s === 'new',
  },
  {
    key: 'in_progress',
    label: '진행 중',
    desc: '정규화 · 설계 단계',
    accent: 'bg-blue-500',
    filter: (s: string) => ['parsed', 'candidate_ready'].includes(s),
  },
  {
    key: 'searched',
    label: '검색 완료',
    desc: '유사상표 검색 완료',
    accent: 'bg-amber-400',
    filter: (s: string) => s === 'searched',
  },
  {
    key: 'approved',
    label: '승인 완료',
    desc: '검토 승인 처리됨',
    accent: 'bg-emerald-500',
    filter: (s: string) => ['reviewed', 'approved', 'exported'].includes(s),
  },
];

export default async function InquiriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.firmId) redirect('/login');

  const inquiries = await getInquiries(session.user.firmId);

  const stats = STATUS_STATS.map((s) => ({
    ...s,
    count: inquiries.filter((i) => s.filter(i.status)).length,
  }));

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
            <h1 className="page-title">접수함</h1>
            <p className="page-description">고객 상표 검토 의뢰를 관리합니다</p>
          </div>
          <Link href="/inquiries/new" className="btn-primary">
            + 새로 등록
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.key} className="stat-card">
              <div className="stat-card-value">{stat.count}</div>
              <div className="stat-card-label">{stat.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.desc}</div>
              <div className={`stat-card-accent ${stat.accent}`} />
            </div>
          ))}
        </div>

        {/* Inquiry List */}
        <InquiryList inquiries={inquiries} />
      </main>
    </>
  );
}
