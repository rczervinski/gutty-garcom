import { NextRequest, NextResponse } from 'next/server'
import { readAuthFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = await readAuthFromRequest(req)
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, empresa: { nome: payload.nome, cnpj: payload.cnpj } })
}
