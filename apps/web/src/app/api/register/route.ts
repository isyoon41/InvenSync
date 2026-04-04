import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ip-review/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, department } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: '이름, 이메일, 비밀번호는 필수입니다.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
    }

    // 첫 번째 firm에 가입 (단일 사무소 환경)
    const firm = await prisma.firm.findFirst();
    if (!firm) {
      return NextResponse.json({ error: '사무소 정보를 찾을 수 없습니다.' }, { status: 500 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firmId: firm.id,
        name,
        email,
        passwordHash,
        department: department || null,
        role: 'operator', // 기본 권한: 부서원
        isActive: true,
      },
    });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
