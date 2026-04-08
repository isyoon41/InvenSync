'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface HomeLoginFormProps {
  isAuthenticated: boolean;
  userName?: string | null;
}

export function HomeLoginForm({ isAuthenticated, userName }: HomeLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      router.refresh();
      const callbackUrl = searchParams.get('callbackUrl');
      router.push(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/inquiries');
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Signed in</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">이미 로그인되어 있습니다</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {userName ? `${userName}님, ` : ''}진행 중인 상표 검토 워크플로우로 이동할 수 있습니다.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Link href="/inquiries" className="btn-primary w-full py-3">
            진행 중 의뢰 보기
          </Link>
          <Link href="/inquiries/new" className="btn-secondary w-full py-3">
            새 의뢰 등록
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn-ghost w-full py-3"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="text-center">
        <img src="/logo.png" alt="InvenSync" className="mx-auto h-10 w-auto object-contain" />
        <h2 className="mt-5 text-2xl font-bold text-slate-950">로그인</h2>
        <p className="mt-2 text-sm text-slate-500">상표 검토 워크플로우를 시작하세요</p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="home-email" className="form-label">이메일</label>
          <input
            id="home-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@invensync.kr"
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="home-password" className="form-label">비밀번호</label>
          <input
            id="home-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호 입력"
            className="form-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <p className="text-center text-sm text-slate-500">
          계정이 없으신가요?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>
      </form>
    </div>
  );
}
