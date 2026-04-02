export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (sign in page)
     * - /api/auth (NextAuth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /public assets
     */
    '/((?!login|api/auth|api/debug-env|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
};
