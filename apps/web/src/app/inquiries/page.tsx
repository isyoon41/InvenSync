import React from 'react';
import { Header, InquiryList } from '@/components';
import Link from 'next/link';

// This will be replaced with actual data fetching
async function getInquiries(firmId: string) {
  // TODO: Fetch from API
  return [];
}

export default async function InquiriesPage() {
  const firmId = 'demo-firm'; // TODO: Get from session
  const inquiries = await getInquiries(firmId);

  return (
    <>
      <Header
        firmName="IP Review Desk Demo Firm"
        userName="윤인식"
        userRole="Admin"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
            <p className="mt-2 text-gray-600">
              Manage trademark review requests from clients
            </p>
          </div>
          <Link
            href="/inquiries/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Inquiry
          </Link>
        </div>

        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'New', count: 5, color: 'bg-gray-100' },
              { label: 'In Progress', count: 3, color: 'bg-blue-100' },
              { label: 'Ready for Review', count: 2, color: 'bg-yellow-100' },
              { label: 'Approved', count: 12, color: 'bg-green-100' },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
                <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Inquiries List */}
          <InquiryList inquiries={inquiries} />
        </div>
      </main>
    </>
  );
}
