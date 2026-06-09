import { NextResponse } from 'next/server'
import { clearAuthOnResponse } from '@/lib/auth'
import { clearGarcomCookie } from '@/lib/garcom-auth'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  // Sair da empresa derruba também a sessão do vendedor.
  clearAuthOnResponse(res)
  clearGarcomCookie(res)
  return res
}
