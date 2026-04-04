'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';

type UserRole = 'admin' | 'reviewer' | 'operator';

interface User {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  reviewer: '부서장',
  operator: '부서원',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'badge-blue',
  reviewer: 'badge-purple',
  operator: 'badge-slate',
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', role: '' as UserRole });
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', department: '', role: 'operator' as UserRole });
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user?.role !== 'admin') router.push('/inquiries');
  }, [status, session, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ name: user.name, department: user.department || '', role: user.role });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditUser(null);
      fetchUsers();
      showToast('사용자 정보가 수정되었습니다.');
    }
  };

  const handlePasswordReset = async () => {
    if (!resetUserId || newPassword.length < 6) return;
    const res = await fetch(`/api/admin/users/${resetUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setResetUserId(null);
      setNewPassword('');
      showToast('비밀번호가 초기화되었습니다.');
    }
  };

  const handleToggleActive = async (user: User) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
    showToast(user.isActive ? '계정이 비활성화되었습니다.' : '계정이 활성화되었습니다.');
  };

  const handleAddUser = async () => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (res.ok) {
      setAddModal(false);
      setAddForm({ name: '', email: '', password: '', department: '', role: 'operator' });
      fetchUsers();
      showToast('새 사용자가 추가되었습니다.');
    } else {
      showToast(data.error || '추가 실패');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Header firmName="로딩 중..." />
        <main className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        firmName={session?.user?.firmName || session?.user?.firmId || ''}
        userName={session?.user?.name || ''}
        userRole={session?.user?.role || 'operator'}
        userDepartment={session?.user?.department || undefined}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <main className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">회원 관리</h1>
            <p className="page-description">사무소 구성원 계정을 관리합니다</p>
          </div>
          <button onClick={() => setAddModal(true)} className="btn-primary text-sm">
            + 새 사용자 추가
          </button>
        </div>

        {/* 권한 안내 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {([
            { role: 'admin' as UserRole, desc: '모든 설정·권한 부여·계정 관리·로그 접근' },
            { role: 'reviewer' as UserRole, desc: '소속 부서원 전체 작업 내용 조회 가능' },
            { role: 'operator' as UserRole, desc: '웹앱 서비스 이용, 본인 작업만 조회' },
          ] as { role: UserRole; desc: string }[]).map(({ role, desc }) => (
            <div key={role} className="card p-4 flex items-start gap-3">
              <span className={`badge ${ROLE_COLORS[role]} flex-shrink-0 mt-0.5`}>{ROLE_LABELS[role]}</span>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* 사용자 테이블 */}
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header-cell">이름</th>
                <th className="table-header-cell">부서</th>
                <th className="table-header-cell">권한</th>
                <th className="table-header-cell">이메일</th>
                <th className="table-header-cell">상태</th>
                <th className="table-header-cell text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{user.name}</td>
                  <td className="table-cell text-slate-500">{user.department || '—'}</td>
                  <td className="table-cell">
                    <span className={`badge ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="table-cell text-slate-600 font-mono text-xs">{user.email}</td>
                  <td className="table-cell">
                    <span className={`badge ${user.isActive ? 'badge-emerald' : 'badge-slate'}`}>
                      {user.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => { setResetUserId(user.id); setNewPassword(''); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        비밀번호 초기화
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          user.isActive
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {user.isActive ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 편집 모달 */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-5">사용자 정보 편집</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">이름</label>
                <input className="form-input" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">부서</label>
                <input className="form-input" value={editForm.department} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} placeholder="예: 상표팀" />
              </div>
              <div>
                <label className="form-label">권한</label>
                <select className="form-input" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
                  <option value="admin">관리자</option>
                  <option value="reviewer">부서장</option>
                  <option value="operator">부서원</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditUser(null)} className="btn-secondary flex-1">취소</button>
              <button onClick={handleEditSave} className="btn-primary flex-1">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 초기화 모달 */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">비밀번호 초기화</h3>
            <p className="text-sm text-slate-500 mb-4">새 비밀번호를 입력하면 해당 사용자의 비밀번호가 즉시 변경됩니다.</p>
            <input
              type="password"
              className="form-input mb-4"
              placeholder="새 비밀번호 (6자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setResetUserId(null)} className="btn-secondary flex-1">취소</button>
              <button
                onClick={handlePasswordReset}
                disabled={newPassword.length < 6}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 사용자 추가 모달 */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-5">새 사용자 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">이름 <span className="text-red-500">*</span></label>
                <input className="form-input" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="홍길동" />
              </div>
              <div>
                <label className="form-label">이메일 <span className="text-red-500">*</span></label>
                <input className="form-input" type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} placeholder="name@invensync.kr" />
              </div>
              <div>
                <label className="form-label">부서</label>
                <input className="form-input" value={addForm.department} onChange={(e) => setAddForm((p) => ({ ...p, department: e.target.value }))} placeholder="예: 상표팀" />
              </div>
              <div>
                <label className="form-label">권한</label>
                <select className="form-input" value={addForm.role} onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
                  <option value="admin">관리자</option>
                  <option value="reviewer">부서장</option>
                  <option value="operator">부서원</option>
                </select>
              </div>
              <div>
                <label className="form-label">초기 비밀번호 <span className="text-red-500">*</span></label>
                <input className="form-input" type="password" value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} placeholder="6자 이상" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddModal(false)} className="btn-secondary flex-1">취소</button>
              <button onClick={handleAddUser} className="btn-primary flex-1">추가</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
