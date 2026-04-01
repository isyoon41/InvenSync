'use client';

import React, { useState } from 'react';
import type { Inquiry } from '@ip-review/domain';

export interface InquiryDetailProps {
  inquiry: Inquiry;
  onStatusChange?: (newStatus: string) => void;
  onProcess?: () => void;
  processing?: boolean;
}

export function InquiryDetail({
  inquiry,
  onStatusChange,
  onProcess,
  processing = false,
}: InquiryDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{inquiry.title}</h1>
            <p className="mt-2 text-gray-600">{inquiry.subject || 'No subject'}</p>
          </div>
          {onProcess && (
            <button
              onClick={onProcess}
              disabled={processing || inquiry.status !== 'new'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Start Processing'}
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Proposed Mark Name</label>
            <div className="text-lg font-semibold text-gray-900">
              {inquiry.proposedMarkName || 'Not set'}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <div className="text-lg font-semibold text-gray-900">{inquiry.status}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">From</label>
            <div className="text-gray-700">{inquiry.senderEmail || 'Unknown'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Received</label>
            <div className="text-gray-700">
              {new Date(inquiry.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h2>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {inquiry.rawText}
          </pre>
        </div>
      </div>

      {/* HTML Preview */}
      {inquiry.rawHtml && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">HTML Preview</h2>
          <div
            className="bg-white border border-gray-200 rounded p-4"
            dangerouslySetInnerHTML={{ __html: inquiry.rawHtml }}
          />
        </div>
      )}

      {/* Metadata */}
      {inquiry.metadata && Object.keys(inquiry.metadata).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
          <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(inquiry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
