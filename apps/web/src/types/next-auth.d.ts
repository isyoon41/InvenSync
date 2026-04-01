import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      firmId: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    firmId: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    firmId: string;
    role: string;
  }
}
