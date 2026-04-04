'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

/* ── Icons ─────────────────────────────────────────────────────── */
const ChevronDown = ({ className = '' }: { className?: string }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    <path d="M3 5l4 4 4-4" />
  </svg>
);

const ChevronRight = ({ className = '' }: { className?: string }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    <path d="M5 3l4 4-4 4" />
  </svg>
);

/* ── Menu Data ──────────────────────────────────────────────────── */
interface MenuItem {
  label: string;
  desc: string;
  href: string;
  badge?: string | null;
}

interface Category {
  id: string;
  label: string;
  title: string;
  items: MenuItem[];
}

interface NavItem {
  label: string;
  href?: string;
  categories?: Category[];
  quickLink?: { label: string; href: string };
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: '회원 관리',
    href: '/admin/users',
  },
];

const NAV_ITEMS: NavItem[] = [
  {
    label: '접수함',
    categories: [
      {
        id: 'reception',
        label: '의뢰 접수',
        title: '의뢰 접수 관리',
        items: [
          {
            label: '새 의뢰 등록',
            desc: '신규 고객 상표 검토 의뢰를 등록합니다',
            href: '/inquiries/new',
            badge: 'NEW',
          },
          {
            label: '전체 접수 목록',
            desc: '접수된 모든 상표 검토 의뢰를 확인합니다',
            href: '/inquiries',
            badge: null,
          },
        ],
      },
    ],
    quickLink: { label: '전체 접수함 보기', href: '/inquiries' },
  },
  {
    label: '검토 리포트',
    categories: [
      {
        id: 'reports',
        label: '리포트 관리',
        title: '검토 리포트 관리',
        items: [
          {
            label: '승인 대기',
            desc: 'AI 분석 리포트를 검토하고 승인합니다',
            href: '/review',
            badge: null,
          },
          {
            label: '승인 완료',
            desc: '처리 완료된 리포트 이력을 조회합니다',
            href: '/review?filter=approved',
            badge: null,
          },
        ],
      },
      {
        id: 'drafts',
        label: '고객 회신',
        title: '고객 회신 초안',
        items: [
          {
            label: '회신 초안 확인',
            desc: 'AI가 생성한 고객 회신 초안을 확인합니다',
            href: '/review',
            badge: null,
          },
        ],
      },
    ],
    quickLink: { label: '검토 리포트 전체 보기', href: '/review' },
  },
  {
    label: '통계',
    categories: [
      {
        id: 'analytics',
        label: '업무 현황',
        title: '통계 및 분석',
        items: [
          {
            label: '처리 통계',
            desc: '기간별 상표 검토 처리 현황을 확인합니다',
            href: '/analytics/stats',
            badge: null,
          },
          {
            label: 'KIPRIS 사용 현황',
            desc: 'API 사용량과 월별 조회 이력을 확인합니다',
            href: '/analytics/kipris',
            badge: null,
          },
        ],
      },
    ],
    quickLink: { label: '통계 보기', href: '/analytics' },
  },
];

/* ── Props ──────────────────────────────────────────────────────── */
export interface HeaderProps {
  firmName: string;
  userName?: string;
  userRole?: string;
  userDepartment?: string;
}

const roleLabels: Record<string, string> = {
  admin: '관리자',
  reviewer: '부서장',
  operator: '부서원',
};

/* ── Component ──────────────────────────────────────────────────── */
export function Header({ firmName, userName, userRole, userDepartment }: HeaderProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roleLabel = userRole ? (roleLabels[userRole] ?? userRole) : undefined;

  /* ── Hover handlers with debounce ──────────── */
  const openMenuPanel = useCallback((label: string, firstCategoryId?: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(label);
    if (firstCategoryId) setActiveCategory(firstCategoryId);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 160);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => { setOpenMenu(null); }, [pathname]);

  /* ── Derived ────────────────────────────────── */
  const activeNavItem = NAV_ITEMS.find((item) => item.label === openMenu);
  const activeCategoryData = activeNavItem?.categories?.find((c) => c.id === activeCategory);

  const isNavActive = (item: NavItem) => {
    if (item.href) return pathname === item.href;
    if (item.categories) {
      return item.categories.some((c) =>
        c.items.some((i) => pathname.startsWith(i.href.split('?')[0]))
      );
    }
    return false;
  };

  return (
    <header className="relative bg-white border-b border-slate-200 z-50">
      {/* ── Top Bar ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">

          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0">
              <img
                src="/logo.png"
                alt="InvenSync"
                className="h-8 w-auto object-contain"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {[...NAV_ITEMS, ...(userRole === 'admin' ? ADMIN_NAV_ITEMS : [])].map((item) => {
                const active = isNavActive(item);
                const isOpen = openMenu === item.label;

                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => openMenuPanel(item.label, item.categories?.[0]?.id)}
                    onMouseLeave={scheduleClose}
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                          active
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                          active || isOpen
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                        <ChevronDown
                          className={`transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-slate-800 leading-tight">
                {userDepartment || '부서 미지정'}
              </div>
              {userName && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {userName}
                  {roleLabel && (
                    <span className="ml-1 text-slate-400">· {roleLabel}</span>
                  )}
                </div>
              )}
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
              <span className="text-white font-bold text-sm">
                {userName?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors duration-150"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* ── Mega Menu Panel ─────────────────────── */}
      {openMenu && activeNavItem?.categories && (
        <div
          className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 mega-panel"
          style={{ boxShadow: '0 8px 32px -4px rgba(15,23,42,0.12), 0 4px 12px -4px rgba(15,23,42,0.07)' }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex gap-0">

              {/* 2Depth: Category Sidebar */}
              <div className="w-44 flex-shrink-0 pr-6">
                <div className="space-y-0.5">
                  {activeNavItem.categories.map((category) => (
                    <button
                      key={category.id}
                      onMouseEnter={() => setActiveCategory(category.id)}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        activeCategory === category.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-slate-100 flex-shrink-0 mr-6" />

              {/* 3Depth: Items Grid */}
              {activeCategoryData && (
                <div className="flex-1 min-w-0">
                  {/* Section Title */}
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {activeCategoryData.title}
                  </div>

                  {/* Item Grid */}
                  <div className={`grid gap-3 ${
                    activeCategoryData.items.length === 1 ? 'grid-cols-1 max-w-xs' :
                    activeCategoryData.items.length === 2 ? 'grid-cols-2 max-w-lg' :
                    'grid-cols-3'
                  }`}>
                    {activeCategoryData.items.map((menuItem) => (
                      <Link
                        key={`${menuItem.href}-${menuItem.label}`}
                        href={menuItem.href}
                        onClick={() => setOpenMenu(null)}
                        className="group flex flex-col p-3.5 rounded-xl border border-transparent
                                   hover:border-slate-200 hover:bg-slate-50
                                   transition-all duration-150"
                      >
                        {/* Item title + badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors duration-150">
                            {menuItem.label}
                          </span>
                          {menuItem.badge && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded leading-none">
                              {menuItem.badge}
                            </span>
                          )}
                        </div>

                        {/* Divider line (like the image) */}
                        <div className="w-8 h-px bg-slate-200 group-hover:bg-blue-300 mb-2 transition-colors duration-200" />

                        {/* Description */}
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {menuItem.desc}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Link Footer */}
            {activeNavItem.quickLink && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <Link
                  href={activeNavItem.quickLink.href}
                  onClick={() => setOpenMenu(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-150"
                >
                  {activeNavItem.quickLink.label}
                  <ChevronRight />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
