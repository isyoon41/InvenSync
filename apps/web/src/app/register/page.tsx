'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, department: form.department }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
        return;
      }
      router.push('/login?registered=1');
    } catch {
      setError('서버 오류가 발생했습니다. 다시 시도해 주세요.');
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
          <h2 className="text-center text-2xl font-bold text-slate-900 mb-8">회원가입</h2>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="card py-8 px-6 sm:px-10">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="name" className="form-label">이름 <span className="text-red-500">*</span></label>
                <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} placeholder="홍길동" className="form-input" />
              </div>

              <div>
                <label htmlFor="email" className="form-label">이메일 <span className="text-red-500">*</span></label>
                <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="name@invensync.kr" className="form-input" />
              </div>

              <div>
                <label htmlFor="department" className="form-label">부서</label>
                <input id="department" name="department" type="text" value={form.department} onChange={handleChange} placeholder="예: 상표팀" className="form-input" />
              </div>

              <div>
                <label htmlFor="password" className="form-label">비밀번호 <span className="text-red-500">*</span></label>
                <input id="password" name="password" type="password" required value={form.password} onChange={handleChange} placeholder="6자 이상" className="form-input" />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="form-label">비밀번호 확인 <span className="text-red-500">*</span></label>
                <input id="confirmPassword" name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} placeholder="비밀번호 재입력" className="form-input" />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                    가입 중...
                  </span>
                ) : '회원가입'}
              </button>

              <p className="text-center text-sm text-slate-500 mt-4">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">로그인</Link>
              </p>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            가입 후 관리자 승인 전까지 부서원(기본) 권한이 부여됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
