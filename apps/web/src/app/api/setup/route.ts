import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ip-review/db';
import bcrypt from 'bcryptjs';

/**
 * 최초 관리자 계정 생성 API (일회성 설정용)
 * - 이미 admin 계정이 존재하면 거부
 * - SETUP_SECRET 환경변수와 일치하는 secret 헤더가 필요
 *
 * 사용법:
 *   curl -X POST https://your-domain.vercel.app/api/setup \
 *     -H "x-setup-secret: YOUR_SETUP_SECRET" \
 *     -H "Content-Type: application/json"
 */
export async function POST(req: NextRequest) {
  try {
    // 보안: SETUP_SECRET 환경변수 또는 기본 fallback 검증
    const setupSecret = process.env.SETUP_SECRET || 'invensync-setup-2026';
    const reqSecret = req.headers.get('x-setup-secret');

    if (reqSecret !== setupSecret) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    // 이미 admin이 존재하면 중복 실행 방지
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });
    if (existingAdmin) {
      return NextResponse.json(
        { message: '관리자 계정이 이미 존재합니다.', email: existingAdmin.email },
        { status: 200 }
      );
    }

    // Firm 확인
    let firm = await prisma.firm.findFirst();
    if (!firm) {
      firm = await prisma.firm.create({
        data: {
          name: 'InvenSync',
          plan: 'trial',
        },
      });
    }

    // 마스터 관리자 생성
    const passwordHash = await bcrypt.hash('123456', 10);
    const admin = await prisma.user.create({
      data: {
        firmId: firm.id,
        name: '관리자',
        email: 'yd.kim@invensync.kr',
        passwordHash,
        department: '관리',
        role: 'admin',
        isActive: true,
      },
    });

    // 데모 계정도 함께 생성 (없는 경우에만)
    const demoUsers = [
      { name: '윤대리', email: 'yoon@example.com', role: 'operator' as const, department: '상표팀' },
      { name: '김부서장', email: 'kim@example.com', role: 'reviewer' as const, department: '상표팀' },
    ];

    for (const u of demoUsers) {
      const exists = await prisma.user.findUnique({ where: { email: u.email } });
      if (!exists) {
        await prisma.user.create({
          data: {
            firmId: firm.id,
            name: u.name,
            email: u.email,
            passwordHash: await bcrypt.hash('123456', 10),
            department: u.department,
            role: u.role,
            isActive: true,
          },
        });
      }
    }

    return NextResponse.json(
      {
        message: '초기 계정 생성 완료',
        admin: { email: admin.email, name: admin.name },
        note: '비밀번호: 123456 (로그인 후 반드시 변경하세요)',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[setup]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
