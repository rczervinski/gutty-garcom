import { NextRequest, NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query, transaction } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET  /api/garcom/comandas            — lista comandas abertas (status=0) agrupadas
 * GET  /api/garcom/comandas?numero=X   — itens da comanda X
 * POST /api/garcom/comandas            — cria/append pedido (lote) numa comanda
 * PUT  /api/garcom/comandas            — substitui todos os itens em aberto de uma comanda
 */

export const GET = withGarcom(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const numero = parseInt(searchParams.get('numero') || '0')

  if (!numero) {
    const r = await query(
      `SELECT
          comanda,
          COALESCE(NULLIF(TRIM(nome), ''), '') AS nome,
          COUNT(*)   AS total_itens,
          SUM(total) AS valor_total,
          MIN(data)  AS data_abertura
       FROM pedidos_terminal
       WHERE status = 0
       GROUP BY comanda, COALESCE(NULLIF(TRIM(nome), ''), '')
       ORDER BY comanda ASC`
    )
    const data = r.rows.map((row: any) => ({
      comanda: Number(row.comanda),
      nome: row.nome || '',
      totalItens: Number(row.total_itens) || 0,
      valorTotal: Number(row.valor_total) || 0,
      descricao: row.nome ? `${row.comanda} - ${row.nome}` : String(row.comanda),
    }))
    return NextResponse.json({ success: true, data })
  }

  const r = await query(
    `SELECT
        pt.codigo, pt.comanda, pt.mesa, pt.codigo_gtin,
        pt.valor, pt.qtde, pt.total, pt.obs, pt.nome, pt.data, pt.hora, pt.item,
        COALESCE(p.descricao, pt.codigo_gtin) AS descricao,
        COALESCE(p_ib.unidade, 'UN')          AS unidade
     FROM pedidos_terminal pt
     LEFT JOIN produtos    p    ON p.codigo_gtin       = pt.codigo_gtin
     LEFT JOIN produtos_ib p_ib ON p_ib.codigo_interno = p.codigo_interno
     WHERE pt.comanda = $1 AND pt.status = 0
     ORDER BY pt.item ASC, pt.codigo ASC`,
    [numero]
  )

  const itens = r.rows.map((row: any) => ({
    id: Number(row.codigo),
    comanda: Number(row.comanda),
    codigoGtin: row.codigo_gtin,
    descricao: row.descricao,
    unidade: row.unidade,
    valor: Number(row.valor) || 0,
    qtde: Number(row.qtde) || 0,
    total: Number(row.total) || 0,
    obs: row.obs || '',
    nome: row.nome || '',
  }))

  const nome = itens.find((i: any) => i.nome)?.nome || ''
  const valorTotal = itens.reduce((s: number, i: any) => s + i.total, 0)

  return NextResponse.json({ success: true, data: { comanda: numero, nome, valorTotal, itens } })
})

export const POST = withGarcom(async (req: NextRequest, { vendedor }) => {
  const body = await req.json().catch(() => null)
  const comanda = parseInt(body?.comanda) || 0
  const mesa = parseInt(body?.mesa) || comanda
  const nomeRaw = typeof body?.nome === 'string' ? body.nome.trim() : ''
  const nome = nomeRaw ? nomeRaw.toUpperCase() : null
  const obs = typeof body?.obs === 'string' ? body.obs.trim().slice(0, 200) : ''
  const items: any[] = Array.isArray(body?.items) ? body.items : []

  if (!comanda || items.length === 0) {
    return NextResponse.json({ success: false, error: 'Comanda e itens são obrigatórios' }, { status: 400 })
  }

  const now = new Date()
  const dataStr = now.toISOString().split('T')[0]
  const horaStr = now.toTimeString().split(' ')[0]

  try {
    const result = await transaction(async (client) => {
      const itemRes = await client.query(
        `SELECT COALESCE(MAX(item), 0) AS maxitem FROM pedidos_terminal WHERE comanda = $1`,
        [comanda]
      )
      let item = Number(itemRes.rows[0]?.maxitem) || 0
      let inseridos = 0

      for (const it of items) {
        const codigoGtin = String(it?.codigo_gtin ?? it?.codigoGtin ?? '').trim()
        const valor = Number(it?.valor ?? it?.precoVenda) || 0
        const qtde = Number(it?.qtde ?? it?.quantidade) || 0
        if (!codigoGtin || valor <= 0 || qtde <= 0) continue
        const total = Number((valor * qtde).toFixed(2))
        item += 1
        await client.query(
          `INSERT INTO pedidos_terminal
             (comanda, mesa, operador, data, hora, codigo_gtin, valor, qtde, total, status, obs, impresso, atendido, item, nome)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, 0, 0, $11, $12)`,
          [comanda, mesa || null, vendedor.codigo, dataStr, horaStr, codigoGtin, valor, qtde, total, obs || null, item, nome]
        )
        inseridos += 1
      }

      if (inseridos === 0) throw new Error('Nenhum item válido para inserir')
      return inseridos
    })

    return NextResponse.json({ success: true, data: { comanda, inseridos: result } }, { status: 201 })
  } catch (e: any) {
    console.error('[comandas POST]', e?.message)
    return NextResponse.json({ success: false, error: 'Erro ao salvar pedido' }, { status: 500 })
  }
})

export const PUT = withGarcom(async (req: NextRequest, { vendedor }) => {
  const body = await req.json().catch(() => null)
  const comanda = parseInt(body?.comanda) || 0
  const nomeRaw = typeof body?.nome === 'string' ? body.nome.trim() : ''
  const nome = nomeRaw ? nomeRaw.toUpperCase() : null
  const items: any[] = Array.isArray(body?.items) ? body.items : []

  if (!comanda) {
    return NextResponse.json({ success: false, error: 'Comanda é obrigatória' }, { status: 400 })
  }

  const now = new Date()
  const dataStr = now.toISOString().split('T')[0]
  const horaStr = now.toTimeString().split(' ')[0]

  try {
    await transaction(async (client) => {
      if (nome) {
        await client.query(`DELETE FROM pedidos_terminal WHERE comanda = $1 AND status = 0 AND nome = $2`, [comanda, nome])
      } else {
        await client.query(`DELETE FROM pedidos_terminal WHERE comanda = $1 AND status = 0`, [comanda])
      }

      let item = 0
      for (const it of items) {
        const codigoGtin = String(it?.codigo_gtin ?? it?.codigoGtin ?? '').trim()
        const valor = Number(it?.valor ?? it?.precoVenda) || 0
        const qtde = Number(it?.qtde ?? it?.quantidade) || 0
        if (!codigoGtin || valor <= 0 || qtde <= 0) continue
        const total = Number((valor * qtde).toFixed(2))
        item += 1
        await client.query(
          `INSERT INTO pedidos_terminal
             (comanda, mesa, operador, data, hora, codigo_gtin, valor, qtde, total, status, impresso, atendido, item, nome)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 0, $9, $10)`,
          [comanda, vendedor.codigo, dataStr, horaStr, codigoGtin, valor, qtde, total, item, nome]
        )
      }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[comandas PUT]', e?.message)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar comanda' }, { status: 500 })
  }
})
