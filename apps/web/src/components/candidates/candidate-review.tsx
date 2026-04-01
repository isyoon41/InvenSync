'use client';

import React from 'react';
import type { GoodsCandidate } from '@ip-review/domain';

export interface CandidateReviewProps {
  candidates: GoodsCandidate[];
  onToggleSelection?: (id: string, selected: boolean) => void;
  onUpdateRationale?: (id: string, rationale: string) => void;
}

export function CandidateReview({
  candidates,
  onToggleSelection,
  onUpdateRationale,
}: CandidateReviewProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Candidates</h2>
        <p className="text-sm text-gray-600 mt-1">
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} generated
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={candidate.isSelected}
                    onChange={(e) => onToggleSelection?.(candidate.id, e.target.checked)}
                    className="w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {candidate.term}
                    </h3>
                    <p className="text-sm text-gray-600">{candidate.normalizedTerm}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider">
                      Class No
                    </label>
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.classNo}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider">
                      Source
                    </label>
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.sourceType}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider">
                      Confidence
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(candidate.confidence * 100)}%
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${candidate.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-gray-600">Rationale</label>
                  <textarea
                    value={candidate.rationale}
                    onChange={(e) => onUpdateRationale?.(candidate.id, e.target.value)}
                    className="mt-1 w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Edit rationale for this candidate..."
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No candidates yet</p>
        </div>
      )}
    </div>
  );
}
