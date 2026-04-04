'use client';

import React, { useState } from 'react';
import type { ReviewReport, ReviewEvidenceSearchResult } from '@ip-review/domain';

export interface ReviewReportProps {
  report: ReviewReport;
  editable?: boolean;
  onSave?: (updates: Partial<ReviewReport>) => void;
  onApprove?: () => void;
}

/* ── KIPRIS Link Builder ─────────────────────────────────────── */
function buildKiprisUrl(applicationNumber?: string, markName?: string): string {
  if (applicationNumber) {
    return `https://doi.kipris.or.kr/kdoi/searchKdoiInfoReadView.do?applno=${applicationNumber}`;
  }
  if (markName) {
    return `https://patent.kipris.or.kr/search/MainSearch.do?query=${encodeURIComponent(markName)}`;
  }
  return 'https://patent.kipris.or.kr/search/MainSearch.do';
}

/* ── Rich Text Renderer ──────────────────────────────────────── */
function renderLines(para: string) {
  const lines = para.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  if (paragraphs.length <= 1) {
    return (
      <p className="text-sm text-slate-700 leading-relaxed">{renderLines(text)}</p>
    );
  }
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-sm text-slate-700 leading-relaxed">
          {renderLines(para)}
        </p>
      ))}
    </div>
  );
}

/* ── Evidence Badge ──────────────────────────────────────────── */
function EvidenceBadge({ result, index }: { result: ReviewEvidenceSearchResult; index: number }) {
  const url = buildKiprisUrl(result.applicationNumber, result.markName);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
      title={`KIPRIS에서 "${result.markName}" 상표 원문 보기`}
    >
      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>
      {result.markName}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60">
        <path d="M3 1h6v6M1 9l8-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

/* ── Section Card ────────────────────────────────────────────── */
interface SectionProps {
  icon: string;
  title: string;
  accentColor: string;
  headerBg: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, accentColor, headerBg, children }: SectionProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden`}
      style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
    >
      <div className={`px-5 py-3.5 flex items-center gap-2.5 ${headerBg} border-b border-slate-100`}>
        <span className="text-base">{icon}</span>
        <h2 className={`text-sm font-bold uppercase tracking-wide ${accentColor}`}>{title}</h2>
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export function ReviewReport({
  report,
  editable = false,
  onSave,
  onApprove,
}: ReviewReportProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    summary: report.summary || '',
    riskNote: report.riskNote || '',
    recommendation: report.recommendation || '',
    clientReplyDraft: report.clientReplyDraft || '',
    internalNote: report.internalNote || '',
  });

  const handleSave = () => {
    onSave?.(formData);
    setEditMode(false);
  };

  const isApproved = !!report.approvedAt;
  const evidences = report.evidences ?? [];

  return (
    <div className="space-y-5">
      {/* 상태 바 */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between"
        style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">검토 리포트</h1>
          {isApproved && (
            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {(report as any).approvedBy?.name ?? report.approvedByUserId} 승인 ·{' '}
              {report.approvedAt ? new Date(report.approvedAt).toLocaleDateString('ko-KR') : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {editable && !isApproved && (
            editMode ? (
              <>
                <button onClick={handleSave}
                  className="px-3.5 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  저장
                </button>
                <button onClick={() => setEditMode(false)}
                  className="px-3.5 py-1.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                  취소
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)}
                className="px-3.5 py-1.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                ✎ 수정
              </button>
            )
          )}
          {onApprove && !isApproved && (
            <button onClick={onApprove}
              className="px-3.5 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              ✓ 승인
            </button>
          )}
        </div>
      </div>

      {/* 검토 요약 */}
      <SectionCard icon="📋" title="검토 요약" accentColor="text-blue-700" headerBg="bg-blue-50">
        {editMode ? (
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            rows={5}
            placeholder="검토 요약을 입력하세요..."
          />
        ) : report.summary ? (
          <RichText text={report.summary} />
        ) : (
          <p className="text-sm text-slate-400 italic">검토 요약 없음</p>
        )}
      </SectionCard>

      {/* 위험 분석 */}
      <SectionCard icon="⚠️" title="위험 분석" accentColor="text-red-700" headerBg="bg-red-50">
        {editMode ? (
          <textarea
            value={formData.riskNote}
            onChange={(e) => setFormData({ ...formData, riskNote: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            rows={4}
            placeholder="위험 분석 내용을 입력하세요..."
          />
        ) : (
          <>
            {report.riskNote ? (
              <RichText text={report.riskNote} />
            ) : (
              <p className="text-sm text-slate-400 italic">위험 분석 없음</p>
            )}
            {evidences.length > 0 && evidences[0].searchResult && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">근거 상표</p>
                <div className="flex flex-wrap gap-2">
                  {evidences.map((ev, i) =>
                    ev.searchResult ? (
                      <EvidenceBadge key={ev.id} result={ev.searchResult} index={i} />
                    ) : null
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* 출원 가능성 평가 */}
      <SectionCard icon="✅" title="출원 가능성 평가" accentColor="text-emerald-700" headerBg="bg-emerald-50">
        {editMode ? (
          <textarea
            value={formData.recommendation}
            onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            rows={4}
            placeholder="출원 가능성 평가를 입력하세요..."
          />
        ) : report.recommendation ? (
          <RecommendationText text={report.recommendation} />
        ) : (
          <p className="text-sm text-slate-400 italic">평가 없음</p>
        )}
      </SectionCard>

      {/* 고객 회신 초안 */}
      <SectionCard icon="✉️" title="고객 회신 초안" accentColor="text-violet-700" headerBg="bg-violet-50">
        {editMode ? (
          <textarea
            value={formData.clientReplyDraft}
            onChange={(e) => setFormData({ ...formData, clientReplyDraft: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            rows={6}
            placeholder="고객 회신 초안을 입력하세요..."
          />
        ) : report.clientReplyDraft ? (
          <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4">
            <RichText text={report.clientReplyDraft} />
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">회신 초안 없음</p>
        )}
      </SectionCard>

      {/* 내부 메모 */}
      <SectionCard icon="🔒" title="내부 메모" accentColor="text-slate-600" headerBg="bg-slate-50">
        {editMode ? (
          <textarea
            value={formData.internalNote}
            onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            rows={3}
            placeholder="내부 메모를 입력하세요..."
          />
        ) : report.internalNote ? (
          <RichText text={report.internalNote} />
        ) : (
          <p className="text-sm text-slate-400 italic">내부 메모 없음</p>
        )}
      </SectionCard>

      {/* 참고 상표 (KIPRIS 근거 자료) */}
      {evidences.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
        >
          <div className="px-5 py-3.5 bg-amber-50 border-b border-slate-100 flex items-center gap-2.5">
            <span className="text-base">🔍</span>
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700">참고 상표 (KIPRIS 근거 자료)</h2>
            <span className="ml-auto text-xs text-slate-400">{evidences.length}건</span>
          </div>
          <div className="divide-y divide-slate-50">
            {evidences.map((evidence, index) => {
              const sr = evidence.searchResult;
              const kiprisUrl = buildKiprisUrl(sr?.applicationNumber, sr?.markName);
              return (
                <div key={evidence.id} className="px-5 py-4 flex items-start gap-4">
                  {/* 번호 */}
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-sm text-slate-900">
                        {sr?.markName ?? '(상표명 없음)'}
                      </span>
                      {sr?.statusLabel && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          sr.statusLabel.includes('등록') ? 'bg-emerald-100 text-emerald-700' :
                          sr.statusLabel.includes('출원') ? 'bg-blue-100 text-blue-700' :
                          sr.statusLabel.includes('거절') || sr.statusLabel.includes('취하') ? 'bg-slate-100 text-slate-500' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {sr.statusLabel}
                        </span>
                      )}
                      {sr?.classNo && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full">
                          제{sr.classNo}류
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {sr?.applicantName && (
                        <span>출원인: <span className="text-slate-700">{sr.applicantName}</span></span>
                      )}
                      {sr?.applicationNumber && (
                        <span>출원번호: <span className="font-mono text-slate-700">{sr.applicationNumber}</span></span>
                      )}
                      {sr?.registerNumber && (
                        <span>등록번호: <span className="font-mono text-slate-700">{sr.registerNumber}</span></span>
                      )}
                      {sr?.relevanceScore != null && (
                        <span>유사도: <span className={`font-semibold ${
                          sr.relevanceScore >= 0.8 ? 'text-red-600' :
                          sr.relevanceScore >= 0.5 ? 'text-amber-600' : 'text-slate-600'
                        }`}>{Math.round(sr.relevanceScore * 100)}%</span></span>
                      )}
                    </div>

                    {sr?.designatedGoodsSummary && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-1">{sr.designatedGoodsSummary}</p>
                    )}
                    {evidence.note && (
                      <p className="mt-1 text-xs text-slate-500 italic">{evidence.note}</p>
                    )}
                  </div>

                  {/* KIPRIS 링크 */}
                  <a
                    href={kiprisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    KIPRIS
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 1h6v6M1 9l8-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              );
            })}
          </div>

          {/* KIPRIS 링크 안내 */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <circle cx="6" cy="6" r="5" /><path d="M6 5v4M6 3.5h.01" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-slate-400">
              KIPRIS 버튼을 클릭하면 특허정보검색서비스에서 해당 상표의 출원 속보 · 행정처리 이력 · 분류코드 변동 이력을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Recommendation Text with verdict highlight ──────────────── */
function RecommendationText({ text }: { text: string }) {
  const verdictMap: Record<string, { label: string; color: string; bg: string }> = {
    '출원 권장': { label: '출원 권장', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    '조건부 출원': { label: '조건부 출원', color: 'text-amber-700', bg: 'bg-amber-100' },
    '출원 재검토 필요': { label: '출원 재검토 필요', color: 'text-red-700', bg: 'bg-red-100' },
  };

  const verdict = Object.keys(verdictMap).find((v) => text.startsWith(v));
  const meta = verdict ? verdictMap[verdict] : null;

  if (!meta || !verdict) {
    return <RichText text={text} />;
  }

  const rest = text.slice(verdict.length).replace(/^[\s—–-]+/, '');
  return (
    <div>
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold mb-3 ${meta.bg} ${meta.color}`}>
        {meta.label}
      </span>
      {rest && <RichText text={rest} />}
    </div>
  );
}
