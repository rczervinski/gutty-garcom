import { NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/garcom/categorias — categorias do cardápio.
 * Mostra tudo (sem depender de produtos.status), escondendo só categorias
 * cujos produtos estão todos INATIVOS em produtos_ou.inativo (NULL/'0' = ativo).
 */
export const GET = withGarcom(async () => {
  const r = await query(
    `SELECT DISTINCT pb.categoria AS categoria
       FROM produtos_ib pb
       LEFT JOIN produtos_ou ou ON ou.codigo_interno = pb.codigo_interno
      WHERE (ou.inativo IS NULL OR ou.inativo = '0')
        AND pb.categoria IS NOT NULL AND TRIM(pb.categoria) <> ''
      ORDER BY pb.categoria`
  )
  return NextResponse.json({ success: true, data: r.rows.map((row: any) => row.categoria) })
})
