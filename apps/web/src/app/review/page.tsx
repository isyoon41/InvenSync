'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ReviewReport } from '@ip-review/domain';

const riskLabelKo: Record<string, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
  unknown: '미확인',
};

export default function ReviewPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [pendingReports, setPendingReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');

  useEffect(() => {
    if (!session?.user?.firmId) {
      setLoading(false);
      return;
    }

    const fetchReports = async () => {
      try {
        const firmId = session.user.firmId;

        const pendingRes = await fetch(
          `/api/review-reports?firmId=${encodeURIComponent(firmId)}&pendingApproval=true`
        );
        const pendingData = await pendingRes.json();
        setPendingReports(pendingData.items || []);

        const approvedRes = await fetch(`/api/review-reports?firmId=${encodeURIComponent(firmId)}&since=2024-01-01`);
        const approvedData = await approvedRes.json();
        setReports(approvedData.items || []);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [session?.user?.firmId]);

  const displayReports = filter === 'pending' ? pendingReports : reports;

  return (
    <>
      <Header
        firmName={session?.user?.firmId || 'IP Review Desk'}
        userName={session?.user?.name || '사용자'}
        userRole={session?.user?.role || 'reviewer'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">검토 리포트</h1>
          <p className="mt-2 text-gray-600">
            상표 검토 리포트 및 고객 회신 승인을 관리합니다
          </p>
        </div>

        {/* 현황 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-red-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-900">{pendingReports.length}</div>
            <div className="text-sm text-red-700">승인 대기</div>
          </div>
          <div className="bg-green-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900">{reports.length}</div>
            <div className="text-sm text-green-700">승인 완료</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              {pendingReports.length + reports.length}
            </div>
            <div className="text-sm text-blue-700">전체 리포트</div>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex gap-4 mb-6">
          {(['pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {f === 'pending' ? '승인 대기' : '승인 완료'}
            </button>
          ))}
        </div>

        {/* 리포트 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">불러오는 중...</div>
          ) : displayReports.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              {filter === 'pending' ? '승인 대기 중인' : '승인 완료된'} 리포트가 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      상표명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      위험도
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      등록일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayReports.map((report) => {
                    const riskLevel = report.riskNote
                      ? report.riskNote.includes('high') || report.riskNote.includes('높음')
                        ? 'high'
                        : report.riskNote.includes('medium') || report.riskNote.includes('중간')
                          ? 'medium'
                          : 'low'
                      : 'unknown';

                    const riskColors: Record<string, string> = {
                      high: 'text-red-700 bg-red-100',
                      medium: 'text-yellow-700 bg-yellow-100',
                      low: 'text-green-700 bg-green-100',
                      unknown: 'text-gray-700 bg-gray-100',
                    };

                    return (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {(report as any).inquiry?.proposedMarkName || '상표명 미설정'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              riskColors[riskLevel]
                            }`}
                          >
                            {riskLabelKo[riskLevel]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              report.approvedAt
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {report.approvedAt ? '승인 완료' : '승인 대기'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/review/${report.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            보기
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
