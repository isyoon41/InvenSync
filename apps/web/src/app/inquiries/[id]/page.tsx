'use client';

import React, { useState, useEffect } from 'react';
import { Header, InquiryDetail, CandidateReview, SearchResults, NormalizationPanel } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { Inquiry, GoodsCandidate, SearchResult, ParsedInquiryData } from '@ip-review/domain';

interface PageProps {
  params: {
    id: string;
  };
}

export default function InquiryDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInquiryData | null>(null);
  const [candidates, setCandidates] = useState<GoodsCandidate[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'search'>('overview');

  useEffect(() => {
    const fetchInquiry = async () => {
      try {
        const res = await fetch(`/api/inquiries/${params.id}`);
        const data = await res.json();
        setInquiry(data);

        if (data.status !== 'new') {
          try {
            const parsedRes = await fetch(`/api/inquiries/${params.id}/parsed-data`);
            if (parsedRes.ok) {
              const parsedDataResult = await parsedRes.json();
              setParsedData(parsedDataResult);
            }
          } catch (e) {
            console.warn('Could not fetch parsed data:', e);
          }
        }

        if (data.status !== 'new') {
          const candidateRes = await fetch(`/api/candidates?candidateRunId=${data.id}`);
          const candidateData = await candidateRes.json();
          setCandidates(candidateData.items || []);
        }

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

  const handleParse = async () => {
    setParsing(true);
    try {
      const res = await fetch(`/api/inquiries/${params.id}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.inquiry) {
        setInquiry(result.inquiry);
      }
      if (result.parsedData) {
        setParsedData(result.parsedData);
      }
    } catch (error) {
      console.error('Failed to parse inquiry:', error);
      alert('정규화 처리 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    } finally {
      setParsing(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/inquiries/${params.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        // 상태 갱신
        const updatedRes = await fetch(`/api/inquiries/${params.id}`);
        setInquiry(await updatedRes.json());
        const candidateRes = await fetch(`/api/candidates?candidateRunId=${result.candidateRunId}`);
        const candidateData = await candidateRes.json();
        setCandidates(candidateData.items || []);
        setActiveTab('candidates');
      }
    } catch (error) {
      console.error('Failed to process inquiry:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportMessage(null);
    try {
      const res = await fetch('/api/review-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: params.id }),
      });
      const result = await res.json();
      if (res.ok) {
        setReportMessage('✓ 검토 리포트가 생성되었습니다');
        const updatedRes = await fetch(`/api/inquiries/${params.id}`);
        setInquiry(await updatedRes.json());
      } else {
        setReportMessage(`오류: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportMessage('리포트 생성 중 오류가 발생했습니다');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setSearchMessage(null);
    try {
      const res = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: params.id }),
      });
      const result = await res.json();
      if (res.ok) {
        setSearchMessage(result.message || '검색이 완료되었습니다');
        // 결과 갱신
        const updatedInquiry = await fetch(`/api/inquiries/${params.id}`);
        const updatedData = await updatedInquiry.json();
        setInquiry(updatedData);
        const resultsRes = await fetch(`/api/search-results?searchJobId=${result.searchJobId}`);
        const resultsData = await resultsRes.json();
        setResults(resultsData.items || []);
        setActiveTab('search');
      } else {
        setSearchMessage(`오류: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to execute search:', error);
      setSearchMessage('검색 실행 중 오류가 발생했습니다');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header
          firmName={session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'operator'}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">불러오는 중...</div>
        </main>
      </>
    );
  }

  if (!inquiry) {
    return (
      <>
        <Header
          firmName={session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'operator'}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">의뢰를 찾을 수 없습니다</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        firmName={session?.user?.firmId || 'IP Review Desk'}
        userName={session?.user?.name || '사용자'}
        userRole={session?.user?.role || 'operator'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/inquiries" className="text-blue-600 hover:text-blue-700">
            ← 접수함으로
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-900">{inquiry.title}</span>
        </div>

        <InquiryDetail
          inquiry={inquiry}
          onProcess={inquiry.status === 'new' ? handleParse : handleProcess}
          processing={inquiry.status === 'new' ? parsing : processing}
        />

        {/* 액션 버튼 영역 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* 지정상품 설계 버튼: parsed 상태일 때 */}
          {inquiry.status === 'parsed' && (
            <>
              <button
                onClick={handleProcess}
                disabled={processing}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {processing ? '⚙️ 생성 중...' : '⚙️ 지정상품 설계 시작'}
              </button>
            </>
          )}

          {/* 유사상표 검색 버튼: candidate_ready 상태일 때 */}
          {inquiry.status === 'candidate_ready' && (
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {searching ? '🔍 검색 중...' : '🔍 유사상표 검색 시작'}
            </button>
          )}
          {searchMessage && (
            <span className="text-sm text-gray-600">{searchMessage}</span>
          )}

          {/* 검토 리포트 생성 버튼: searched 상태일 때 */}
          {inquiry.status === 'searched' && (
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {generatingReport ? '📝 분석 중...' : '📝 검토 리포트 생성 (AI)'}
            </button>
          )}
          {reportMessage && (
            <span className="text-sm text-gray-600">{reportMessage}</span>
          )}
        </div>

        {/* 정규화 결과 패널 */}
        {(inquiry.status !== 'new' || parsedData) && (
          <div className="mt-8">
            <NormalizationPanel
              inquiryId={params.id}
              parsedData={parsedData || undefined}
              loading={parsing}
              onRegenerate={inquiry.status !== 'new' ? handleParse : undefined}
            />
          </div>
        )}

        {/* 탭 */}
        <div className="mt-8 border-b border-gray-200">
          <div className="flex gap-8">
            {[
              { id: 'overview' as const, label: '개요' },
              { id: 'candidates' as const, label: '지정상품 후보', count: candidates.length },
              { id: 'search' as const, label: '유사상표 검색 결과', count: results.length },
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

        {/* 탭 내용 */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="text-center text-gray-500">
              지정상품 후보 또는 유사상표 검색 결과 탭을 선택하세요
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
