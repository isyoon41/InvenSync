'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header, InquiryDetail, CandidateReview, SearchResults, NormalizationPanel, SimilarGoodsSearch } from '@/components';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Inquiry, GoodsCandidate, SearchResult, ParsedInquiryData } from '@ip-review/domain';

/* ── 진행 단계 스텝퍼 ─────────────────────────────────────────────── */
const STEPS = [
  { no: '01', label: '접수',        sub: '의뢰 등록',        icon: '📥' },
  { no: '02', label: '정규화',      sub: 'AI 상표명 추출',   icon: '🔄' },
  { no: '03', label: '지정상품',    sub: '류·유사군 추천',   icon: '🎯' },
  { no: '04', label: '유사검색',    sub: 'KIPRIS 자동 검색', icon: '🔍' },
  { no: '05', label: '검토 리포트', sub: '위험도 분석',      icon: '📋' },
];

const STATUS_STEP: Record<string, number> = {
  new: 0, parsed: 1, candidate_ready: 2, searched: 3,
  reviewed: 4, approved: 4, exported: 4,
};

function InquiryProgressStepper({
  status,
  onStepClick,
}: {
  status: string;
  onStepClick: (stepIdx: number) => void;
}) {
  const currentStep = STATUS_STEP[status] ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 mb-6">
      <div className="flex items-center justify-between relative">
        {/* 연결선 */}
        <div className="absolute left-0 right-0 top-[28px] h-px bg-slate-200 mx-[calc(100%/10)]" />

        {STEPS.map((step, idx) => {
          const done = idx < currentStep;
          const active = idx === currentStep;
          const clickable = idx <= currentStep;
          return (
            <button
              key={step.no}
              onClick={() => clickable && onStepClick(idx)}
              disabled={!clickable}
              className={`flex flex-col items-center gap-2 relative z-10 flex-1 bg-transparent border-none p-0 transition-opacity ${
                clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
            >
              {/* 원형 아이콘 */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-sm border-2 transition-all duration-300 ${
                done
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : active
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-slate-200 text-slate-300'
              }`}>
                {done ? '✓' : step.icon}
              </div>
              {/* 텍스트 */}
              <div className="text-center">
                <div className={`text-[11px] font-bold mb-0.5 ${
                  active ? 'text-orange-500' : done ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  {step.no}
                </div>
                <div className={`text-xs font-semibold ${
                  active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {step.label}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{step.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function InquiryDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'similar-goods' | 'search'>('overview');

  // 섹션 refs (스크롤 이동용)
  const detailRef = useRef<HTMLDivElement>(null);
  const normRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  // 스텝 클릭 → 해당 섹션으로 이동
  const handleStepClick = useCallback((stepIdx: number) => {
    if (stepIdx === 0) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (stepIdx === 1) {
      normRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (stepIdx === 2) {
      setActiveTab('candidates');
      tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (stepIdx === 3) {
      setActiveTab('search');
      tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (stepIdx === 4) {
      router.push('/review');
    }
  }, [router]);

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
          // inquiryId로 최신 candidateRun 후보 조회
          const candidateRes = await fetch(`/api/candidates?inquiryId=${data.id}`);
          const candidateData = await candidateRes.json();
          setCandidates(candidateData.items || []);
        }

        if (data.status === 'searched' || data.status === 'reviewed') {
          // 최신 완료된 search job 조회 후 결과 가져오기
          const jobsRes = await fetch(`/api/search-jobs?inquiryId=${data.id}`);
          const jobsData = await jobsRes.json();
          const doneJob = (jobsData.items || []).find((j: any) => j.state === 'done');
          if (doneJob) {
            const resultsRes = await fetch(`/api/search-results?searchJobId=${doneJob.id}`);
            const resultsData = await resultsRes.json();
            setResults(resultsData.items || []);
          }
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
      // 정규화 완료 → 정규화 결과 섹션으로 이동
      setTimeout(() => normRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
        // 지정상품 완료 → 후보 탭으로 이동
        setActiveTab('candidates');
        setTimeout(() => tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
        setReportMessage('✓ 검토 리포트가 생성되었습니다. 검토 리포트 페이지로 이동합니다...');
        const updatedRes = await fetch(`/api/inquiries/${params.id}`);
        setInquiry(await updatedRes.json());
        // 리포트 생성 완료 → 검토 리포트 페이지로 이동
        setTimeout(() => router.push('/review'), 1500);
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
        // 검색 완료 → 검색 결과 탭으로 이동
        setActiveTab('search');
        setTimeout(() => tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
          firmName={session?.user?.firmName || session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'operator'}
          userDepartment={session?.user?.department || undefined}
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
          firmName={session?.user?.firmName || session?.user?.firmId || 'IP Review Desk'}
          userName={session?.user?.name || '사용자'}
          userRole={session?.user?.role || 'operator'}
          userDepartment={session?.user?.department || undefined}
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
        firmName={session?.user?.firmName || session?.user?.firmId || 'IP Review Desk'}
        userName={session?.user?.name || '사용자'}
        userRole={session?.user?.role || 'operator'}
        userDepartment={session?.user?.department || undefined}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/inquiries" className="text-blue-600 hover:text-blue-700">
            ← 접수함으로
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-900">{inquiry.title}</span>
        </div>

        <InquiryProgressStepper status={inquiry.status} onStepClick={handleStepClick} />

        <div ref={detailRef}>
        <InquiryDetail
          inquiry={inquiry}
          onProcess={inquiry.status === 'new' ? handleParse : handleProcess}
          processing={inquiry.status === 'new' ? parsing : processing}
        />
        </div>

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
          <div className="mt-8" ref={normRef}>
            <NormalizationPanel
              inquiryId={params.id}
              parsedData={parsedData || undefined}
              loading={parsing}
              onRegenerate={inquiry.status !== 'new' ? handleParse : undefined}
            />
          </div>
        )}

        {/* 탭 */}
        <div className="mt-8 border-b border-gray-200" ref={tabRef}>
          <div className="flex gap-8">
            {[
              { id: 'overview' as const, label: '개요' },
              { id: 'candidates' as const, label: '지정상품 후보', count: candidates.length },
              { id: 'similar-goods' as const, label: '유사상품 검색' },
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
          {activeTab === 'similar-goods' && (
            <SimilarGoodsSearch
              initialQuery={candidates[0]?.term ?? inquiry.proposedMarkName ?? ''}
            />
          )}
          {activeTab === 'search' && <SearchResults results={results} />}
        </div>
      </main>
    </>
  );
}
