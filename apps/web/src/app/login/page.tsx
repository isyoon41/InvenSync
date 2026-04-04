'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setSuccess('회원가입이 완료되었습니다. 로그인해 주세요.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        router.refresh();
        const callbackUrl = searchParams.get('callbackUrl');
        router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/inquiries');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Link href="/">
            <img src="/logo.png" alt="InvenSync" className="h-8 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="InvenSync" className="h-12 w-auto object-contain mx-auto mb-4" />
            <p className="text-slate-500 text-sm">상표 검토 자동화 시스템</p>
          </div>
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-8">로그인</h2>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="card py-8 px-6 sm:px-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-emerald-700">{success}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="form-label">이메일</label>
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@invensync.kr" className="form-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">비밀번호 (6자 이상)</label>
                <input
                  id="password" name="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력" className="form-input"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                    로그인 중...
                  </span>
                ) : '로그인'}
              </button>

              <p className="text-center text-sm text-slate-500 mt-2">
                계정이 없으신가요?{' '}
                <Link href="/register" className="text-blue-600 font-semibold hover:underline">회원가입</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
