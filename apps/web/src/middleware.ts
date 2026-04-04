export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * 인증이 필요한 경로만 매치:
     * - /inquiries, /review, /analytics, /admin 등 앱 내부 경로
     * 공개 경로 제외:
     * - / (랜딩페이지)
     * - /login, /register
     * - /api/auth (NextAuth)
     * - /api/setup (초기 설정)
     * - /_next, 정적 파일
     */
    '/inquiries/:path*',
    '/review/:path*',
    '/analytics/:path*',
    '/admin/:path*',
    '/api/inquiries/:path*',
    '/api/candidates/:path*',
    '/api/search-jobs/:path*',
    '/api/search-results/:path*',
    '/api/review-reports/:path*',
    '/api/admin/:path*',
  ],
};
