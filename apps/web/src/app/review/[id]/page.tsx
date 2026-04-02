'use client';

import React, { useState, useEffect } from 'react';
import { Header, ReviewReport } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ReviewReport as ReviewReportType } from '@ip-review/domain';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ReviewDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const [report, setReport] = useState<ReviewReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/review-reports/${params.id}`);
        const data = await res.json();
        setReport(data);
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
          firmName={session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'reviewer'}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">불러오는 중...</div>
        </main>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Header
          firmName={session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'reviewer'}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">리포트를 찾을 수 없습니다</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        firmName={session?.user?.firmId || 'IP Review Desk'}
        userName={session?.user?.name || '사용자'}
        userRole={session?.user?.role || 'reviewer'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/review" className="text-blue-600 hover:text-blue-700">
            ← 검토 리포트 목록
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-900">검토 리포트</span>
        </div>

        <ReviewReport
          report={report}
          editable={!report.approvedAt}
          onSave={handleSave}
          onApprove={handleApprove}
        />

        {/* 근거 자료 목록 */}
        {report.evidences && report.evidences.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">근거 자료</h2>
            <div className="space-y-4">
              {report.evidences.map((evidence, index) => (
                <div key={evidence.id} className="border border-gray-200 rounded p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">근거 {index + 1}</h3>
                      {evidence.note && (
                        <p className="text-sm text-gray-600 mt-2">{evidence.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
