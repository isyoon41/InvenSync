import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@ip-review/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: '이메일',
      credentials: {
        email: {
          label: '이메일',
          type: 'email',
        },
        password: {
          label: '비밀번호',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

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

        // 비밀번호 검증: passwordHash가 없는 기존 계정은 거부
        if (!user.passwordHash) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          firmId: user.firmId,
          firmName: user.firm.name,
          role: user.role,
          department: user.department ?? undefined,
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
        token.firmName = user.firmName;
        token.role = user.role;
        token.department = user.department;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.firmId = token.firmId;
      session.user.firmName = token.firmName;
      session.user.role = token.role;
      session.user.department = token.department;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};
