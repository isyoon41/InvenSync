'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface InquiryFormProps {
  firmId?: string;
}

interface FormData {
  title: string;
  clientName: string;
  companyName: string;
  clientEmail: string;
  content: string;
  tags: string;
}

interface FormErrors {
  title?: string;
  clientName?: string;
  content?: string;
}

export function InquiryForm({ firmId = 'demo-firm' }: InquiryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    clientName: '',
    companyName: '',
    clientEmail: '',
    content: '',
    tags: '',
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '검토 제목을 입력하세요';
    }
    if (!formData.clientName.trim()) {
      newErrors.clientName = '고객명을 입력하세요';
    }
    if (!formData.content.trim()) {
      newErrors.content = '상품/서비스 설명을 입력하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firmId,
          title: formData.title,
          clientName: formData.clientName,
          companyName: formData.companyName,
          clientEmail: formData.clientEmail,
          rawText: formData.content,
          tags: formData.tags
            ? formData.tags.split(',').map((t) => t.trim())
            : [],
          attachmentCount: files.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '의뢰 등록에 실패했습니다');
      }

      const data = await response.json();
      router.push(`/inquiries/${data.id}`);
    } catch (error) {
      setErrors({
        title: error instanceof Error ? error.message : '폼 제출 중 오류가 발생했습니다',
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 검토 제목 */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          검토 제목 *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="예: 스마트폰 액세서리 상표 검토"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* 고객 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
            고객명 *
          </label>
          <input
            type="text"
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleInputChange}
            placeholder="예: 김지원"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700"
          >
            회사명
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="예: (주)ABC코퍼레이션"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 고객 이메일 */}
      <div>
        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">
          고객 이메일
        </label>
        <input
          type="email"
          id="clientEmail"
          name="clientEmail"
          value={formData.clientEmail}
          onChange={handleInputChange}
          placeholder="예: client@example.com"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 상품/서비스 설명 */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          상품/서비스 설명 *
        </label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleInputChange}
          placeholder="상표명, 지정상품 또는 서비스, 추가 맥락 정보를 입력하세요..."
          rows={6}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
      </div>

      {/* 태그 */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          태그 (쉼표로 구분)
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          placeholder="예: 긴급, 패션, 식품"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 첨부파일 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          첨부파일 (선택)
        </label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            id="files"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="files"
            className="cursor-pointer block"
          >
            <div className="text-gray-600">
              <p className="font-medium">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-sm text-gray-500 mt-1">
                PDF, Word, Excel 문서 (최대 10개)
              </p>
            </div>
          </label>

          {files.length > 0 && (
            <div className="mt-4 text-left">
              <p className="text-sm font-medium text-gray-700 mb-2">
                선택된 파일:
              </p>
              <ul className="space-y-1">
                {files.map((file, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    • {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
        >
          {loading ? '등록 중...' : '✓ 접수'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
