import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextAuthSessionProvider } from '@/components/session-provider';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'InvenSync — 상표 검토 자동화',
  description: '변리사를 위한 상표 검토 요청 자동화 시스템',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <NextAuthSessionProvider session={session}>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
