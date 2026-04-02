import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? 'NOT_SET';
  // Mask password but show host
  const masked = dbUrl.replace(/:([^@]+)@/, ':***@');
  return NextResponse.json({ DATABASE_URL: masked, NODE_ENV: process.env.NODE_ENV });
}
