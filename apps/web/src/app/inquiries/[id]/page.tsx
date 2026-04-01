'use client';

import React, { useState, useEffect } from 'react';
import { Header, InquiryDetail, CandidateReview, SearchResults } from '@/components';
import Link from 'next/link';
import type { Inquiry, GoodsCandidate, SearchResult } from '@ip-review/domain';

interface PageProps {
  params: {
    id: string;
  };
}

export default function InquiryDetailPage({ params }: PageProps) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [candidates, setCandidates] = useState<GoodsCandidate[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'search'>('overview');

  useEffect(() => {
    // Fetch inquiry data
    const fetchInquiry = async () => {
      try {
        const res = await fetch(`/api/inquiries/${params.id}`);
        const data = await res.json();
        setInquiry(data);

        // Fetch candidates if available
        if (data.status !== 'new') {
          const candidateRes = await fetch(`/api/candidates?candidateRunId=${data.id}`);
          const candidateData = await candidateRes.json();
          setCandidates(candidateData.items || []);
        }

        // Fetch search results if available
        if (data.status === 'searched' || data.status === 'reviewed') {
          const resultsRes = await fetch(`/api/search-results?searchJobId=${data.id}`);
          const resultsData = await resultsRes.json();
          setResults(resultsData.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch inquiry:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInquiry();
  }, [params.id]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/inquiries/${params.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.inquiry) {
        setInquiry(result.inquiry);
      }
    } catch (error) {
      console.error('Failed to process inquiry:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header firmName="IP Review Desk" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </main>
      </>
    );
  }

  if (!inquiry) {
    return (
      <>
        <Header firmName="IP Review Desk" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Inquiry not found</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header firmName="IP Review Desk" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/inquiries" className="text-blue-600 hover:text-blue-700">
            ← Back to Inquiries
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-900">{inquiry.title}</span>
        </div>

        <InquiryDetail
          inquiry={inquiry}
          onProcess={handleProcess}
          processing={processing}
        />

        {/* Tabs */}
        <div className="mt-8 border-b border-gray-200">
          <div className="flex gap-8">
            {[
              { id: 'overview' as const, label: 'Overview' },
              { id: 'candidates' as const, label: 'Candidates', count: candidates.length },
              { id: 'search' as const, label: 'Search Results', count: results.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-1 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 text-xs bg-gray-100 rounded-full px-2 py-1">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="text-center text-gray-500">
              Select candidates or search results tabs to view details
            </div>
          )}
          {activeTab === 'candidates' && (
            <CandidateReview candidates={candidates} />
          )}
          {activeTab === 'search' && <SearchResults results={results} />}
        </div>
      </main>
    </>
  );
}
