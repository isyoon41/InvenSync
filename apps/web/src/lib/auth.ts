import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@ip-review/db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: '이메일',
      credentials: {
        email: {
          label: '이메일',
          type: 'email',
          placeholder: 'yoon@example.com',
        },
        password: {
          label: '비밀번호',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Lookup user by email
        // NOTE: Password check is skipped for development
        // In production, add bcrypt.compare(credentials.password, user.passwordHash)
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            isActive: true,
          },
          include: {
            firm: true,
          },
        });

        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          firmId: user.firmId,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.firmId = user.firmId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.firmId = token.firmId;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};
