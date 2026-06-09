import { NextRequest, NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/garcom/produtos?categoria=...   — produtos de uma categoria
 * GET /api/garcom/produtos?q=...           — busca por descrição/GTIN
 */
export const GET = withGarcom(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const categoria = (searchParams.get('categoria') || '').trim()
  const q = (searchParams.get('q') || '').trim()

  if (!categoria && !q) {
    return NextResponse.json({ success: false, error: 'Informe categoria ou q' }, { status: 400 })
  }

  // Alinhado à produção: INNER JOIN produtos + só ATIVOS (status='E').
  const base = `
    SELECT
      ib.codigo_interno              AS codigo_interno,
      p.codigo_gtin                  AS codigo_gtin,
      p.descricao                    AS descricao,
      ib.descricao_detalhada         AS descricao_detalhada,
      ib.grupo                       AS grupo,
      ib.categoria                   AS categoria,
      ib.preco_venda                 AS preco_venda,
      COALESCE(ou.qtde, 0)           AS qtde
    FROM produtos p
    INNER JOIN produtos_ib ib ON ib.codigo_interno = p.codigo_interno
    LEFT JOIN produtos_ou ou  ON ou.codigo_interno = p.codigo_interno
  `

  let r
  if (categoria) {
    // Categoria case-insensitive (igual à produção: upper()=upper()).
    r = await query(
      `${base} WHERE p.status = 'E' AND upper(ib.categoria) = upper($1) ORDER BY p.descricao`,
      [categoria]
    )
  } else {
    r = await query(
      `${base} WHERE p.status = 'E'
         AND (p.codigo_gtin ILIKE $1 OR ib.descricao_detalhada ILIKE $1 OR p.descricao ILIKE $1)
       ORDER BY p.descricao LIMIT 60`,
      [`%${q}%`]
    )
  }

  const data = r.rows.map((row: any) => ({
    codigoInterno: Number(row.codigo_interno),
    codigoGtin: row.codigo_gtin || '',
    descricao: row.descricao || '',
    descricaoDetalhada: row.descricao_detalhada || '',
    grupo: row.grupo || '',
    categoria: row.categoria || '',
    precoVenda: Number(row.preco_venda) || 0,
    qtde: Number(row.qtde) || 0,
  }))

  return NextResponse.json({ success: true, data })
})
