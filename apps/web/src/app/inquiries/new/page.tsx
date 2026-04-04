import React from 'react';
import { Header } from '@/components';
import { InquiryForm } from '@/components/forms/InquiryForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewInquiryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.firmId) {
    redirect('/login');
  }

  const firmId = session.user.firmId;

  return (
    <>
      <Header
        firmName={session.user.firmName || session.user.firmId || 'InvenSync'}
        userName={session.user.name || '?¬ìš©??}
        userRole={session.user.role || 'operator'}
        userDepartment={session.user.department || undefined}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">???˜ë¢° ?±ë¡</h1>
          <p className="mt-2 text-gray-600">
            ?í‘œ ê²€???˜ë¢°ë¥??ˆë¡œ ?±ë¡?©ë‹ˆ?? * ?œì‹œ ??ª©?€ ?„ìˆ˜?…ë‹ˆ??
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <InquiryForm firmId={firmId} />
        </div>
      </main>
    </>
  );
}
