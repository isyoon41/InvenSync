'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const MAX_ATTACHMENT_COUNT = 10;
const MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_ATTACHMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.gif'];

export interface InquiryFormProps {
  firmId?: string;
  defaultHandlerName?: string;
  defaultHandlerDept?: string;
}

interface InquiryFormData {
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
  attachments?: string;
}

export function InquiryForm({ firmId = 'demo-firm', defaultHandlerName = '', defaultHandlerDept = '' }: InquiryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [handlerName, setHandlerName] = useState(defaultHandlerName);
  const [handlerDept, setHandlerDept] = useState(defaultHandlerDept);
  const [formData, setFormData] = useState<InquiryFormData>({
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
      setFiles(validateFiles(Array.from(e.dataTransfer.files)));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(validateFiles(Array.from(e.target.files)));
    }
  };

  const validateFiles = (nextFiles: File[]): File[] => {
    const limitedFiles = nextFiles.slice(0, MAX_ATTACHMENT_COUNT);
    const rejected = nextFiles.length > MAX_ATTACHMENT_COUNT
      ? [`최대 ${MAX_ATTACHMENT_COUNT}개까지만 첨부할 수 있습니다.`]
      : [];

    let totalSize = 0;
    const accepted = limitedFiles.filter((file) => {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const isSupported = SUPPORTED_ATTACHMENT_EXTENSIONS.includes(extension);
      const isSmallEnough = file.size <= MAX_ATTACHMENT_SIZE_BYTES;
      const fitsTotalLimit = totalSize + file.size <= MAX_TOTAL_ATTACHMENT_SIZE_BYTES;
      if (!isSupported) {
        rejected.push(`${file.name}: PDF, DOCX, 텍스트, 이미지 파일만 분석할 수 있습니다.`);
      }
      if (!isSmallEnough) {
        rejected.push(`${file.name}: 파일당 4MB 이하만 분석할 수 있습니다.`);
      }
      if (!fitsTotalLimit) {
        rejected.push(`${file.name}: 전체 첨부파일 용량은 10MB 이하만 분석할 수 있습니다.`);
      }
      const isAccepted = isSupported && isSmallEnough && fitsTotalLimit;
      if (isAccepted) totalSize += file.size;
      return isAccepted;
    });

    setErrors((prev) => ({
      ...prev,
      attachments: rejected.length ? rejected.join(' ') : undefined,
    }));
    return accepted;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('firmId', firmId);
      payload.append('title', formData.title);
      payload.append('clientName', formData.clientName);
      payload.append('companyName', formData.companyName);
      payload.append('clientEmail', formData.clientEmail);
      payload.append('handlerName', handlerName);
      payload.append('handlerDept', handlerDept);
      payload.append('rawText', formData.content);
      payload.append('tags', formData.tags);
      files.forEach((file) => payload.append('attachments', file));

      const response = await fetch('/api/inquiries', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || '의뢰 등록에 실패했습니다');
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
      {/* 담당자 정보 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <path d="M5 1a2 2 0 100 4A2 2 0 005 1zM2 8c0-1.5 1.3-2.5 3-2.5S8 6.5 8 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">담당자 정보</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">담당자명</label>
            <input
              type="text"
              value={handlerName}
              onChange={(e) => setHandlerName(e.target.value)}
              placeholder="담당자 이름"
              className="block w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">부서명</label>
            <input
              type="text"
              value={handlerDept}
              onChange={(e) => setHandlerDept(e.target.value)}
              placeholder="소속 부서"
              className="block w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>
      </div>

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
            accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif"
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
                PDF, Word(.docx), 텍스트, 이미지 파일 (최대 10개, 파일당 4MB, 전체 10MB)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                첨부파일은 정규화와 검토 의견서 생성 시 함께 분석됩니다.
              </p>
            </div>
          </label>

          {errors.attachments && (
            <p className="mt-3 text-sm text-red-600">{errors.attachments}</p>
          )}

          {files.length > 0 && (
            <div className="mt-4 text-left">
              <p className="text-sm font-medium text-gray-700 mb-2">
                AI 분석 대상 첨부파일:
              </p>
              <ul className="space-y-1">
                {files.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm text-gray-600">
                    <span>• {file.name}</span>
                    <span className="shrink-0 text-xs text-blue-600">
                      {(file.size / 1024).toFixed(1)} KB · 분석 예정
                    </span>
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
