'use client';

import React from 'react';
import type { SearchResult } from '@ip-review/domain';

export interface SearchResultsProps {
  results: SearchResult[];
  onToggleShortlist?: (id: string, shortlisted: boolean) => void;
}

export function SearchResults({ results, onToggleShortlist }: SearchResultsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>

      {results.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center">
          <p className="text-gray-500">No search results</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {results.map((result) => (
            <div key={result.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{result.markName}</h3>
                  {result.applicantName && (
                    <p className="text-sm text-gray-600">{result.applicantName}</p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {result.applicationNumber && (
                      <div>
                        <label className="text-xs text-gray-600 uppercase tracking-wider">
                          Application No
                        </label>
                        <div className="text-sm font-medium text-gray-900">
                          {result.applicationNumber}
                        </div>
                      </div>
                    )}
                    {result.registerNumber && (
                      <div>
                        <label className="text-xs text-gray-600 uppercase tracking-wider">
                          Register No
                        </label>
                        <div className="text-sm font-medium text-gray-900">
                          {result.registerNumber}
                        </div>
                      </div>
                    )}
                    {result.classNo && (
                      <div>
                        <label className="text-xs text-gray-600 uppercase tracking-wider">
                          Class
                        </label>
                        <div className="text-sm font-medium text-gray-900">
                          {result.classNo}
                        </div>
                      </div>
                    )}
                    {result.statusLabel && (
                      <div>
                        <label className="text-xs text-gray-600 uppercase tracking-wider">
                          Status
                        </label>
                        <div className="text-sm font-medium text-gray-900">
                          {result.statusLabel}
                        </div>
                      </div>
                    )}
                  </div>

                  {result.relevanceScore && (
                    <div className="mt-4">
                      <label className="text-xs text-gray-600 uppercase tracking-wider">
                        Relevance Score
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-sm font-medium text-gray-900">
                          {Math.round(result.relevanceScore * 100)}%
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${result.relevanceScore * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {result.designatedGoodsSummary && (
                    <div className="mt-4">
                      <label className="text-xs text-gray-600 uppercase tracking-wider">
                        Goods
                      </label>
                      <p className="text-sm text-gray-700 mt-1">{result.designatedGoodsSummary}</p>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  {result.sampleImageUrl && (
                    <img
                      src={result.sampleImageUrl}
                      alt={result.markName}
                      className="w-24 h-24 object-contain border border-gray-200 rounded"
                    />
                  )}

                  <button
                    onClick={() => onToggleShortlist?.(result.id, !result.isShortlisted)}
                    className={`mt-4 w-full px-3 py-2 rounded text-sm font-medium ${
                      result.isShortlisted
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {result.isShortlisted ? '★ Shortlisted' : '☆ Shortlist'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
