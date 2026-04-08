'use client';

import React, { useState, useEffect } from 'react';
import { Header, ReviewReport } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ReviewReport as ReviewReportType, SearchResult } from '@ip-review/domain';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ReviewDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const [report, setReport] = useState<ReviewReportType | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/review-reports/${params.id}`);
        const data: ReviewReportType = await res.json();
        setReport(data);

        // evidences가 없거나 searchResult가 없으면 searchJobId로 직접 조회
        const hasEvidenceData = data.evidences && data.evidences.length > 0 &&
          (data.evidences[0] as any).searchResult;

        if (!hasEvidenceData && data.searchJobId) {
          const srRes = await fetch(`/api/search-results?searchJobId=${data.searchJobId}`);
          if (srRes.ok) {
            const srData = await srRes.json();
            setSearchResults(srData.items ?? []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [params.id]);

  const handleSave = async (updates: Partial<ReviewReportType>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/review-reports/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setReport(updated);
    } catch (error) {
      console.error('Failed to save report:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/review-reports/${params.id}?action=approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedByUserId: session?.user?.id || 'unknown',
        }),
      });
      const approved = await res.json();
      setReport(approved);
    } catch (error) {
      console.error('Failed to approve report:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Header
          firmName={session?.user?.firmName || session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'reviewer'}
          userDepartment={session?.user?.department || undefined}
        />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-500 py-20">불러오는 중...</div>
        </main>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Header
          firmName={session?.user?.firmName || session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'reviewer'}
          userDepartment={session?.user?.department || undefined}
        />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-500 py-20">답변서를 찾을 수 없습니다</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        firmName={session?.user?.firmName || session?.user?.firmId || 'IP Review Desk'}
        userName={session?.user?.name || '사용자'}
        userRole={session?.user?.role || 'reviewer'}
        userDepartment={session?.user?.department || undefined}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/review" className="text-blue-600 hover:text-blue-700">← 답변서 목록</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">상표 출원 검토 의견서</span>
        </div>

        {saving && (
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            저장 중...
          </div>
        )}

        <ReviewReport
          report={report}
          fallbackSearchResults={searchResults}
          editable={!report.approvedAt}
          onSave={handleSave}
          onApprove={handleApprove}
        />
      </main>
    </>
  );
}
