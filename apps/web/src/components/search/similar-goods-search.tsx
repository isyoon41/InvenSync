'use client';

import React, { useState } from 'react';

interface SimilarGoodsItem {
  goodsName: string;
  similarCode: string;
  classNo: string;
}

interface SimilarGoodsSearchProps {
  /** 지정상품 후보에서 자동 채워지는 초기 검색어 */
  initialQuery?: string;
}

const KIPRIS_GOODS_URL = 'https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark&query=';

export function SimilarGoodsSearch({ initialQuery = '' }: SimilarGoodsSearchProps) {
  const [query, setQuery]       = useState(initialQuery);
  const [classNo, setClassNo]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<SimilarGoodsItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [source, setSource]     = useState<'kipris' | 'mock' | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ query: query.trim() });
      if (classNo) params.set('classNo', classNo);
      const res = await fetch(`/api/similar-goods?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '검색 오류');
      setResults(data.items ?? []);
      setSource(data.source);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  // 유사군코드별로 그룹핑
  const grouped = results.reduce<Record<string, SimilarGoodsItem[]>>((acc, item) => {
    const key = `${item.similarCode || '미분류'}__${item.classNo || '-'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
    >
      {/* 헤더 */}
      <div className="px-6 py-4 bg-teal-50 border-b border-slate-100 flex items-center gap-2.5">
        <span className="text-base">🗂️</span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-teal-700">유사상품 검색</h2>
        {source === 'mock' && (
          <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
            목 데이터 (TRADEMARK_PROVIDER_MODE=mock)
          </span>
        )}
        {source === 'kipris' && (
          <span className="ml-auto text-[10px] font-semibold bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full">
            KIPRIS 실데이터
          </span>
        )}
      </div>

      {/* 검색 폼 */}
      <div className="px-6 py-5 border-b border-slate-100">
        <form onSubmit={handleSearch} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              상품명 또는 서비스명
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 단어장 앱, 스마트폰 케이스, 화장품"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              류 (선택)
            </label>
            <input
              type="number"
              value={classNo}
              onChange={(e) => setClassNo(e.target.value)}
              placeholder="예: 9"
              min={1}
              max={45}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                </svg>
                검색 중
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5" strokeLinecap="round"/>
                </svg>
                검색
              </>
            )}
          </button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">
          KIPRIS 상품분류 데이터베이스에서 동일 유사군에 속하는 상품 목록을 조회합니다.
        </p>
      </div>

      {/* 결과 */}
      <div className="px-6 py-4">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="9" cy="9" r="5.5"/><path d="M14 14l3 3" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500">상품명을 입력하고 검색하세요</p>
            <p className="text-xs text-slate-400 mt-1">유사군코드별로 동일 유사군 상품이 표시됩니다</p>
          </div>
        )}

        {searched && results.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-slate-600 font-medium">검색 결과가 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">다른 검색어를 시도해보세요</p>
          </div>
        )}

        {Object.keys(grouped).length > 0 && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              총 <span className="font-semibold text-slate-700">{results.length}건</span>의 유사상품이 검색되었습니다.
            </p>
            {Object.entries(grouped).map(([key, items]) => {
              const [similarCode, classNo] = key.split('__');
              return (
                <div key={key} className="border border-slate-100 rounded-xl overflow-hidden">
                  {/* 유사군 헤더 */}
                  <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      유사군 {similarCode}
                    </span>
                    <span className="text-xs text-slate-500">제{classNo}류</span>
                    <span className="text-xs text-slate-400 ml-auto">{items.length}건</span>
                    <a
                      href={`${KIPRIS_GOODS_URL}${encodeURIComponent(items[0]?.goodsName ?? '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      KIPRIS 확인
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </a>
                  </div>
                  {/* 상품 목록 */}
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {items.map((item, i) => (
                      <a
                        key={i}
                        href={`${KIPRIS_GOODS_URL}${encodeURIComponent(item.goodsName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors"
                      >
                        {item.goodsName}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
