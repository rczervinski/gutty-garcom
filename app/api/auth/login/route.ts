import { NextRequest, NextResponse } from 'next/server'
import { findTenantByLogin } from '@/lib/tenants'
import { signToken, attachAuthCookie } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt, resetAttempts, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { nome, senha } = body || {}

  if (!nome || !senha) {
    return NextResponse.json({ ok: false, error: 'missing' }, { status: 400 })
  }

  const ip = getClientIp(req)

  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
    )
  }

  const tenant = await findTenantByLogin(String(nome), String(senha))

  if (!tenant) {
    recordFailedAttempt(ip)
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 })
  }

  resetAttempts(ip)
  console.log(`[auth] Login empresa OK: ${nome} (tenant=${tenant.id})`)

  const token = await signToken({ tid: tenant.id, cnpj: tenant.cnpj, nome: tenant.nome })
  const res = NextResponse.json({ ok: true, tenant: { id: tenant.id, nome: tenant.nome } })
  attachAuthCookie(res, token)
  return res
}
