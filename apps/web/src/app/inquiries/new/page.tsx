import React from 'react';
import { Header } from '@/components';
import { InquiryForm } from '@/components/forms/InquiryForm';

export default function NewInquiryPage() {
  const firmId = 'demo-firm'; // TODO: Get from session

  return (
    <>
      <Header
        firmName="IP Review Desk Demo Firm"
        userName="윤인식"
        userRole="Admin"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New Inquiry</h1>
          <p className="mt-2 text-gray-600">
            Submit a new trademark review request. All fields marked with * are required.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <InquiryForm firmId={firmId} />
        </div>
      </main>
    </>
  );
}
