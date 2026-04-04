import { withAuth } from 'next-auth/middleware';

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
});

export const config = {
  matcher: [
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
