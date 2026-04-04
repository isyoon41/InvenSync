import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@ip-review/db';
import bcrypt from 'bcryptjs';

// 사용자 목록 조회
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { firmId: session.user.firmId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

// 새 사용자 생성 (관리자용)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { name, email, password, department, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: '이름, 이메일, 비밀번호는 필수입니다.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      firmId: session.user.firmId,
      name,
      email,
      passwordHash,
      department: department || null,
      role: role || 'operator',
      isActive: true,
    },
    select: { id: true, name: true, email: true, department: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
