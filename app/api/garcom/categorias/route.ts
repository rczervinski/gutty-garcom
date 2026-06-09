import { NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/garcom/categorias — categorias do cardápio (produtos_ib). */
export const GET = withGarcom(async () => {
  const r = await query(
    `SELECT DISTINCT categoria
       FROM produtos_ib
      WHERE categoria IS NOT NULL AND TRIM(categoria) <> ''
      ORDER BY categoria`
  )
  return NextResponse.json({ success: true, data: r.rows.map((row: any) => row.categoria) })
})
