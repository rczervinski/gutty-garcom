import { NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/garcom/categorias — categorias do cardápio.
 * Alinhado à produção: só categorias com produto ATIVO (produtos.status='E').
 */
export const GET = withGarcom(async () => {
  const r = await query(
    `SELECT DISTINCT pb.categoria AS categoria
       FROM produtos_ib pb
       INNER JOIN produtos p ON pb.codigo_interno = p.codigo_interno
      WHERE p.status = 'E'
        AND pb.categoria IS NOT NULL AND TRIM(pb.categoria) <> ''
      ORDER BY pb.categoria`
  )
  return NextResponse.json({ success: true, data: r.rows.map((row: any) => row.categoria) })
})
