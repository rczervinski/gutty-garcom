import { NextRequest, NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { query, transaction } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CREATE_MERGE_LOG = `
  CREATE TABLE IF NOT EXISTS merge_log (
    id SERIAL PRIMARY KEY,
    data_merge TIMESTAMP DEFAULT NOW(),
    comanda_origem VARCHAR(50),
    comanda_destino VARCHAR(50),
    nome_origem VARCHAR(100),
    nome_destino VARCHAR(100),
    itens_movidos TEXT,
    usuario VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ativo'
  )
`

/** GET /api/garcom/merge — merges recentes (24h). */
export const GET = withGarcom(async () => {
  await query(CREATE_MERGE_LOG)
  const r = await query(
    `SELECT id, data_merge, comanda_origem, comanda_destino, nome_origem, nome_destino, itens_movidos, usuario, status
       FROM merge_log
      WHERE data_merge >= NOW() - INTERVAL '24 hours'
      ORDER BY data_merge DESC
      LIMIT 20`
  )
  const data = r.rows.map((row: any) => ({
    id: Number(row.id),
    dataMerge: row.data_merge,
    comandaOrigem: row.comanda_origem,
    comandaDestino: row.comanda_destino,
    nomeOrigem: row.nome_origem || '',
    nomeDestino: row.nome_destino || '',
    itensMovidos: row.itens_movidos,
    status: row.status,
  }))
  return NextResponse.json({ success: true, data })
})

/** POST /api/garcom/merge — une comanda origem -> destino. */
export const POST = withGarcom(async (req: NextRequest, { vendedor }) => {
  const body = await req.json().catch(() => ({}))
  const origem = String(body?.origem ?? body?.comanda_origem ?? '').trim()
  const destino = String(body?.destino ?? body?.comanda_destino ?? '').trim()

  if (!origem || !destino) {
    return NextResponse.json({ success: false, error: 'Informe origem e destino' }, { status: 400 })
  }
  if (origem === destino) {
    return NextResponse.json({ success: false, error: 'Origem e destino não podem ser iguais' }, { status: 400 })
  }

  try {
    const result = await transaction(async (client) => {
      const origemRes = await client.query(
        `SELECT DISTINCT comanda, nome FROM pedidos_terminal WHERE comanda = $1 AND status = 0 LIMIT 1`,
        [origem]
      )
      if (origemRes.rows.length === 0) {
        throw new Error('Comanda origem não encontrada ou sem itens em aberto')
      }
      const nomeOrigem = String(origemRes.rows[0].nome || '').trim()

      const destinoRes = await client.query(
        `SELECT DISTINCT comanda, nome FROM pedidos_terminal WHERE comanda = $1 AND status = 0 LIMIT 1`,
        [destino]
      )
      const nomeDestino = destinoRes.rows.length > 0 ? String(destinoRes.rows[0].nome || '').trim() : ''

      // Herança de nome: destino > origem.
      const nomeParaUsar = nomeDestino || nomeOrigem || ''

      const selRes = await client.query(
        `SELECT codigo FROM pedidos_terminal WHERE comanda = $1 AND status = 0`,
        [origem]
      )
      const itens = selRes.rows.map((r: any) => r.codigo)
      if (itens.length === 0) throw new Error('Nenhum item na comanda origem')

      const updRes = await client.query(
        `UPDATE pedidos_terminal SET comanda = $1, mesa = $1, nome = $2 WHERE comanda = $3 AND status = 0`,
        [destino, nomeParaUsar || null, origem]
      )

      if (nomeParaUsar && nomeDestino && nomeParaUsar !== nomeDestino) {
        await client.query(
          `UPDATE pedidos_terminal SET nome = $1 WHERE comanda = $2 AND status = 0`,
          [nomeParaUsar, destino]
        )
      }

      await client.query(CREATE_MERGE_LOG)
      await client.query(
        `INSERT INTO merge_log (comanda_origem, comanda_destino, nome_origem, nome_destino, itens_movidos, usuario)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [origem, destino, nomeOrigem, nomeDestino, itens.join(','), `garcom:${vendedor.codigo}`]
      )

      return updRes.rowCount || itens.length
    })

    return NextResponse.json({ success: true, message: `${result} itens movidos de ${origem} para ${destino}` })
  } catch (e: any) {
    console.error('[merge POST]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao unir comandas' }, { status: 500 })
  }
})
