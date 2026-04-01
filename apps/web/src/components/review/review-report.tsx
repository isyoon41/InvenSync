'use client';

import React, { useState } from 'react';
import type { ReviewReport } from '@ip-review/domain';

export interface ReviewReportProps {
  report: ReviewReport;
  editable?: boolean;
  onSave?: (updates: Partial<ReviewReport>) => void;
  onApprove?: () => void;
}

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

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Report</h1>
            {isApproved && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Approved by {report.approvedBy?.name} on{' '}
                {new Date(report.approvedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {editable && !isApproved && (
              <>
                {editMode ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
            {onApprove && !isApproved && (
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        {editMode ? (
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Enter summary..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.summary || 'No summary yet'}
          </div>
        )}
      </div>

      {/* Risk Note */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h2>
        {editMode ? (
          <textarea
            value={formData.riskNote}
            onChange={(e) => setFormData({ ...formData, riskNote: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter risk assessment..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.riskNote || 'No risk assessment yet'}
          </div>
        )}
      </div>

      {/* Recommendation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendation</h2>
        {editMode ? (
          <textarea
            value={formData.recommendation}
            onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter recommendation..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.recommendation || 'No recommendation yet'}
          </div>
        )}
      </div>

      {/* Client Reply Draft */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Reply Draft</h2>
        {editMode ? (
          <textarea
            value={formData.clientReplyDraft}
            onChange={(e) => setFormData({ ...formData, clientReplyDraft: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Draft reply for client..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.clientReplyDraft || 'No draft yet'}
          </div>
        )}
      </div>

      {/* Internal Note */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Internal Note</h2>
        {editMode ? (
          <textarea
            value={formData.internalNote}
            onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Internal notes..."
          />
        ) : (
          <div className="text-gray-700 whitespace-pre-wrap">
            {report.internalNote || 'No internal notes yet'}
          </div>
        )}
      </div>
    </div>
  );
}
