import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@ip-review/db';
import bcrypt from 'bcryptjs';

// 사용자 수정
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { name, department, role, isActive } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user || user.firmId !== session.user.firmId) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: { id: true, name: true, email: true, department: true, role: true, isActive: true },
  });

  return NextResponse.json({ user: updated });
}

// 비밀번호 초기화
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user || user.firmId !== session.user.firmId) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: params.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
