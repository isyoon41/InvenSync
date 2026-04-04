import { withAuth } from 'next-auth/middleware';

const secret = process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-production';

export default withAuth({
  secret,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
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
