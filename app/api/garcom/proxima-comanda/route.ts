import { NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/garcom/proxima-comanda — próximo número de comanda livre. */
export const GET = withGarcom(async () => {
  const r = await query(`SELECT COALESCE(MAX(comanda), 0) + 1 AS next FROM pedidos_terminal`)
  return NextResponse.json({ success: true, data: Number(r.rows[0]?.next) || 1 })
})
