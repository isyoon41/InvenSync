'use client';

import React from 'react';
import Link from 'next/link';

export interface HeaderProps {
  firmName: string;
  userName?: string;
  userRole?: string;
}

export function Header({ firmName, userName, userRole }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              InvenSync
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/inquiries"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Inquiries
              </Link>
              <Link
                href="/review"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Reviews
              </Link>
              <Link
                href="/analytics"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Analytics
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{firmName}</div>
              {userName && (
                <div className="text-xs text-gray-500">
                  {userName} {userRole && `(${userRole})`}
                </div>
              )}
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {userName?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
