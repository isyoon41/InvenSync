'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ReviewReport } from '@ip-review/domain';

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

        // Fetch pending approval reports
        const pendingRes = await fetch(
          `/api/review-reports?firmId=${encodeURIComponent(firmId)}&pendingApproval=true`
        );
        const pendingData = await pendingRes.json();
        setPendingReports(pendingData.items || []);

        // Fetch approved reports
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
        userName={session?.user?.name || 'User'}
        userRole={session?.user?.role || 'Reviewer'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Reports</h1>
          <p className="mt-2 text-gray-600">
            Manage trademark review reports and client approvals
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-red-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-900">{pendingReports.length}</div>
            <div className="text-sm text-red-700">Pending Approval</div>
          </div>
          <div className="bg-green-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900">{reports.length}</div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              {pendingReports.length + reports.length}
            </div>
            <div className="text-sm text-blue-700">Total Reports</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-4 mb-6">
          {['pending' as const, 'approved' as const].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {f === 'pending' ? 'Pending Approval' : 'Approved'}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
          ) : displayReports.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No {filter} reports found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Mark Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayReports.map((report) => {
                    const riskLevel = report.riskNote
                      ? report.riskNote.includes('high')
                        ? 'high'
                        : report.riskNote.includes('medium')
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
                            {(report as any).inquiry?.proposedMarkName || 'Unknown Mark'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              riskColors[riskLevel]
                            }`}
                          >
                            {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
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
                            {report.approvedAt ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/review/${report.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View
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
