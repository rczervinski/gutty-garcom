import { NextResponse } from 'next/server'
import { clearGarcomCookie } from '@/lib/garcom-auth'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ success: true })
  clearGarcomCookie(res)
  return res
}
