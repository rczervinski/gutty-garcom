import { NextRequest, NextResponse } from 'next/server'
import { readGarcomFromRequest } from '@/lib/garcom-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const vendedor = await readGarcomFromRequest(req)
  if (!vendedor) return NextResponse.json({ success: false }, { status: 401 })
  return NextResponse.json({ success: true, vendedor: { codigo: vendedor.codigo, nome: vendedor.nome } })
}
