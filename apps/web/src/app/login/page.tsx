'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        router.push('/inquiries');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Link href="/">
            <img src="/logo.png" alt="InvenSync" className="h-8 w-auto object-contain" />
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="InvenSync"
              className="h-12 w-auto object-contain mx-auto mb-4"
            />
            <p className="text-slate-500 text-sm">상표 검토 자동화 시스템</p>
          </div>
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-8">
            로그인
          </h2>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="card py-8 px-6 sm:px-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="form-label">이메일</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yoon@example.com"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">비밀번호</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="form-input"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  개발 환경: 이메일만으로 로그인 가능합니다
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                    로그인 중...
                  </span>
                ) : '로그인'}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-400 font-medium">데모 계정으로 시작</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  { name: '윤인식', email: 'yoon@example.com', role: 'Admin', roleColor: 'text-blue-600 bg-blue-50' },
                  { name: '홍준',   email: 'hong@example.com', role: 'Reviewer', roleColor: 'text-green-600 bg-green-50' },
                ].map((account) => (
                  <button
                    key={account.email}
                    onClick={() => setEmail(account.email)}
                    className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{account.name}</span>
                        <span className="text-sm text-slate-400 ml-2">{account.email}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${account.roleColor}`}>
                        {account.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
