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
  { no: '05', label: '검토 의견서', sub: '위험도·메일 초안', icon: '📋' },
];

const STATUS_STEP: Record<string, number> = {
  new: 0, parsed: 1, candidate_ready: 2, searched: 3,
  reviewed: 4, approved: 4, exported: 4,
};

type InquiryTab = 'overview' | 'candidates' | 'similar-goods' | 'search';

const ACTION_BUTTON_CLASS: Record<string, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  slate: 'bg-slate-900 hover:bg-slate-800',
};

function statusToneClass(done: boolean, active = false) {
  if (done) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (active) return 'border-orange-200 bg-orange-50 text-orange-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

function WorkflowCommandCenter({
  inquiry,
  parsedData,
  candidates,
  results,
  parsing,
  processing,
  searching,
  generatingReport,
  processMessage,
  searchMessage,
  reportMessage,
  onParse,
  onProcess,
  onSearch,
  onGenerateReport,
  onOpenReport,
  onSelectTab,
}: {
  inquiry: Inquiry;
  parsedData: ParsedInquiryData | null;
  candidates: GoodsCandidate[];
  results: SearchResult[];
  parsing: boolean;
  processing: boolean;
  searching: boolean;
  generatingReport: boolean;
  processMessage: string | null;
  searchMessage: string | null;
  reportMessage: string | null;
  onParse: () => void;
  onProcess: () => void;
  onSearch: () => void;
  onGenerateReport: () => void;
  onOpenReport: () => void;
  onSelectTab: (tab: InquiryTab) => void;
}) {
  const statusConfig = (() => {
    switch (inquiry.status) {
      case 'new':
        return {
          eyebrow: '다음 작업 01',
          title: '고객 요청을 정규화하세요',
          description: '상표명, 상품·서비스, 검토 포인트를 먼저 추출해야 KIPRIS 지정상품 설계로 넘어갈 수 있습니다.',
          actionLabel: parsing ? '정규화 중...' : '정규화 시작',
          onAction: onParse,
          busy: parsing,
          tone: 'blue',
          outputHint: '완료 후 정규화 결과 패널에서 추출값을 확인합니다.',
        };
      case 'parsed':
        return {
          eyebrow: '다음 작업 02',
          title: 'KIPRIS 근거로 지정상품 후보를 설계하세요',
          description: 'KIPRIS 유사상품군을 우선 조회하고 내부 DB는 보조 근거로 참고하여 Claude가 후보를 최종 선정합니다.',
          actionLabel: processing ? '지정상품 설계 중...' : '지정상품 설계 시작',
          onAction: onProcess,
          busy: processing,
          tone: 'blue',
          outputHint: '완료 후 지정상품 후보 탭에서 류와 유사군 코드를 확인합니다.',
        };
      case 'candidate_ready':
        if (candidates.length === 0) {
          return {
            eyebrow: '점검 필요',
            title: '지정상품 후보를 다시 생성하세요',
            description: '현재 상태는 후보 생성 단계로 넘어갔지만 불러올 지정상품 후보가 없습니다. KIPRIS 근거와 Claude 판단으로 후보를 다시 생성합니다.',
            actionLabel: processing ? '지정상품 재생성 중...' : '지정상품 후보 재생성',
            onAction: onProcess,
            busy: processing,
            tone: 'blue',
            outputHint: '완료 후 지정상품 후보 탭에서 후보명, 류, 유사군 코드를 확인합니다.',
          };
        }
        return {
          eyebrow: '다음 작업 03',
          title: 'KIPRIS 유사상표 검색을 실행하세요',
          description: '선정된 후보 지정상품을 기준으로 선행상표와 충돌 가능성을 수집합니다.',
          actionLabel: searching ? '유사상표 검색 중...' : '유사상표 검색 시작',
          onAction: onSearch,
          busy: searching,
          tone: 'orange',
          outputHint: '완료 후 유사상표 검색 결과 탭에서 선행상표 근거를 확인합니다.',
        };
      case 'searched':
        return {
          eyebrow: '다음 작업 04',
          title: '검토 의견서와 고객 회신 초안을 생성하세요',
          description: '지정상품 근거와 유사상표 검색 결과를 종합해 등록가능성, 위험도, 종합의견을 작성합니다.',
          actionLabel: generatingReport ? '의견서 생성 중...' : '검토 의견서 생성 (AI)',
          onAction: onGenerateReport,
          busy: generatingReport,
          tone: 'purple',
          outputHint: '완료 후 답변서 화면에서 의견서와 메일 초안을 검토·수정합니다.',
        };
      default:
        return {
          eyebrow: '산출물 확인',
          title: '생성된 검토 의견서를 확인하세요',
          description: '변리사가 최종 문구를 검토하고 필요한 경우 고객 회신 메일 초안을 수정합니다.',
          actionLabel: '답변서 확인하기',
          onAction: onOpenReport,
          busy: false,
          tone: 'slate',
          outputHint: '답변서 작성 화면에서 승인 상태와 회신 초안을 확인합니다.',
        };
    }
  })();

  const outputChecks = [
    {
      label: '요청 접수',
      value: inquiry.rawText ? '원문 확보' : '원문 없음',
      done: Boolean(inquiry.rawText),
      tab: null,
    },
    {
      label: '정규화 결과',
      value: parsedData?.markNameNormalized || inquiry.proposedMarkName || '대기 중',
      done: Boolean(parsedData),
      tab: null,
    },
    {
      label: '지정상품 후보',
      value: candidates.length
        ? `${candidates.length}개 후보`
        : inquiry.status === 'candidate_ready'
          ? '재생성 필요'
          : '대기 중',
      done: candidates.length > 0,
      tab: 'candidates' as const,
    },
    {
      label: '유사상표 검색',
      value: results.length ? `${results.length}건 결과` : '대기 중',
      done: results.length > 0,
      tab: 'search' as const,
    },
  ];

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {statusConfig.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{statusConfig.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{statusConfig.description}</p>
          <p className="mt-3 text-sm font-medium text-slate-700">{statusConfig.outputHint}</p>
        </div>
        <button
          type="button"
          onClick={statusConfig.onAction}
          disabled={statusConfig.busy}
          className={`w-full rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-auto ${ACTION_BUTTON_CLASS[statusConfig.tone]}`}
        >
          {statusConfig.actionLabel}
        </button>
      </div>

      {(processMessage || searchMessage || reportMessage) && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {processMessage || searchMessage || reportMessage}
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {outputChecks.map((item, idx) => {
          const active = idx === (STATUS_STEP[inquiry.status] ?? 0);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => item.tab && onSelectTab(item.tab)}
              disabled={!item.tab}
              className={`rounded-lg border p-4 text-left transition ${statusToneClass(item.done, active)} ${
                item.tab ? 'hover:border-blue-300 hover:bg-blue-50' : 'cursor-default'
              }`}
            >
              <div className="text-xs font-semibold">{item.done ? '완료' : active ? '진행 중' : '대기'}</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{item.label}</div>
              <div className="mt-1 text-xs text-slate-600">{item.value}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function WorkflowOverview({
  inquiry,
  parsedData,
  candidates,
  results,
  onSelectTab,
  onOpenReport,
}: {
  inquiry: Inquiry;
  parsedData: ParsedInquiryData | null;
  candidates: GoodsCandidate[];
  results: SearchResult[];
  onSelectTab: (tab: InquiryTab) => void;
  onOpenReport: () => void;
}) {
  const hasReport = ['reviewed', 'approved', 'exported'].includes(inquiry.status);
  const cards = [
    {
      title: '1. 요청 추출',
      body: parsedData
        ? `상표명: ${parsedData.markNameNormalized || inquiry.proposedMarkName || '미확인'}`
        : '정규화 시작 버튼으로 상표명, 상품·서비스, 검토 포인트를 추출하세요.',
      done: Boolean(parsedData),
      action: null,
    },
    {
      title: '2. 지정상품 설계',
      body: candidates.length
        ? `Claude가 KIPRIS 우선 근거로 선정한 후보 ${candidates.length}개를 확인할 수 있습니다.`
        : 'KIPRIS 유사상품군 우선 후보가 생성되면 류와 유사군 코드를 확인합니다.',
      done: candidates.length > 0,
      action: candidates.length ? (() => onSelectTab('candidates')) : null,
    },
    {
      title: '3. 유사상표 검색',
      body: results.length
        ? `유사상표 검색 결과 ${results.length}건을 위험도 판단 근거로 사용합니다.`
        : '지정상품 후보를 확정한 뒤 KIPRIS 유사상표 검색을 실행합니다.',
      done: results.length > 0,
      action: results.length ? (() => onSelectTab('search')) : null,
    },
    {
      title: '4. 의견서·메일 초안',
      body: hasReport
        ? '상표 출원 검토 의견서와 고객 회신 메일 초안이 생성되었습니다.'
        : '검색 결과까지 확보되면 AI가 종합의견과 고객 회신 초안을 생성합니다.',
      done: hasReport,
      action: hasReport ? onOpenReport : null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                card.done ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {card.done ? '확인 가능' : '대기'}
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
            </div>
          </div>
          {card.action && (
            <button
              type="button"
              onClick={card.action}
              className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              결과 확인
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

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
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InquiryTab>('overview');

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
      if (!res.ok) {
        alert(`정규화 처리 중 오류가 발생했습니다: ${result.error || '알 수 없는 오류'}`);
        return;
      }
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
    setProcessMessage(null);
    setSearchMessage(null);
    try {
      const res = await fetch(`/api/inquiries/${params.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setProcessMessage(`오류: ${result.error || '지정상품 후보 생성에 실패했습니다'}`);
        return;
      }

      if (result.success) {
        // 상태 갱신
        const updatedRes = await fetch(`/api/inquiries/${params.id}`);
        setInquiry(await updatedRes.json());
        const candidateRes = await fetch(`/api/candidates?candidateRunId=${result.candidateRunId}`);
        const candidateData = await candidateRes.json();
        const nextCandidates = candidateData.items || [];
        setCandidates(nextCandidates);
        setProcessMessage(
          nextCandidates.length
            ? result.message || `${nextCandidates.length}개의 지정상품 후보가 생성되었습니다`
            : '지정상품 후보 생성은 완료됐지만 후보를 불러오지 못했습니다. 후보 재생성을 다시 실행해 주세요.'
        );
        // 지정상품 완료 → 후보 탭으로 이동
        setActiveTab('candidates');
        setTimeout(() => tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch (error) {
      console.error('Failed to process inquiry:', error);
      setProcessMessage('지정상품 후보 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
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
    if (candidates.length === 0) {
      setSearchMessage('먼저 지정상품 후보를 생성해 주세요. 후보가 비어 있으면 지정상품 후보 재생성을 실행해 주세요.');
      return;
    }
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

        <WorkflowCommandCenter
          inquiry={inquiry}
          parsedData={parsedData}
          candidates={candidates}
          results={results}
          parsing={parsing}
          processing={processing}
          searching={searching}
          generatingReport={generatingReport}
          processMessage={processMessage}
          searchMessage={searchMessage}
          reportMessage={reportMessage}
          onParse={handleParse}
          onProcess={handleProcess}
          onSearch={handleSearch}
          onGenerateReport={handleGenerateReport}
          onOpenReport={() => router.push('/review')}
          onSelectTab={setActiveTab}
        />

        <div ref={detailRef}>
          <InquiryDetail inquiry={inquiry} />
        </div>

        {/* 정규화 결과 패널 */}
        {(inquiry.status !== 'new' || parsedData) && (
          <div className="mt-8" ref={normRef}>
            <NormalizationPanel
              inquiryId={params.id}
              parsedData={parsedData || undefined}
              loading={parsing}
              onRegenerate={inquiry.status === 'parsed' ? handleParse : undefined}
              onProceedToCandidates={inquiry.status === 'parsed' ? handleProcess : undefined}
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
            <WorkflowOverview
              inquiry={inquiry}
              parsedData={parsedData}
              candidates={candidates}
              results={results}
              onSelectTab={setActiveTab}
              onOpenReport={() => router.push('/review')}
            />
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
