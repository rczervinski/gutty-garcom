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

// Lê os itens (com nome do produto) de uma comanda — usado para o "diff".
async function lerItens(client: any, comanda: number) {
  const r = await client.query(
    `SELECT pt.codigo, pt.qtde, pt.obs,
            COALESCE((SELECT descricao FROM produtos WHERE codigo_gtin = pt.codigo_gtin LIMIT 1), pt.codigo_gtin) AS descricao
       FROM pedidos_terminal pt
      WHERE pt.comanda = $1 AND pt.status = 0
      ORDER BY pt.item ASC, pt.codigo ASC`,
    [comanda]
  )
  return r.rows.map((row: any) => ({
    id: Number(row.codigo),
    descricao: row.descricao,
    qtde: Number(row.qtde) || 0,
    obs: row.obs || '',
  }))
}

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

/** POST /api/garcom/merge — une comanda origem -> destino (anexa, sem duplicar). */
export const POST = withGarcom(async (req: NextRequest, { vendedor }) => {
  const body = await req.json().catch(() => ({}))
  const origem = parseInt(body?.origem ?? body?.comanda_origem) || 0
  const destino = parseInt(body?.destino ?? body?.comanda_destino) || 0

  if (!origem || !destino) {
    return NextResponse.json({ success: false, error: 'Informe origem e destino' }, { status: 400 })
  }
  if (origem === destino) {
    return NextResponse.json({ success: false, error: 'Origem e destino não podem ser iguais' }, { status: 400 })
  }

  try {
    const out = await transaction(async (client) => {
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
      const nomeFinal = nomeDestino || nomeOrigem || ''

      // Itens que vão ser movidos (para o diff e o log).
      const movedItems = await lerItens(client, origem)
      if (movedItems.length === 0) throw new Error('Nenhum item na comanda origem')
      const itensAntesDestino = await lerItens(client, destino)

      // Base = maior item atual do destino. Os movidos continuam a numeração
      // (anexa em vez de colidir/duplicar com os itens já existentes).
      const baseRes = await client.query(
        `SELECT COALESCE(MAX(item), 0) AS m FROM pedidos_terminal WHERE comanda = $1 AND status = 0`,
        [destino]
      )
      const base = Number(baseRes.rows[0]?.m) || 0

      const upd = await client.query(
        `WITH moved AS (
           SELECT codigo, ROW_NUMBER() OVER (ORDER BY item, codigo) AS rn
             FROM pedidos_terminal
            WHERE comanda = $1 AND status = 0
         )
         UPDATE pedidos_terminal pt
            SET comanda = $2, mesa = $2, nome = $3, item = $4 + moved.rn
           FROM moved
          WHERE pt.codigo = moved.codigo`,
        [origem, destino, nomeFinal || null, base]
      )

      // Padroniza o nome dos itens que já estavam no destino, se mudou.
      if (nomeFinal && nomeDestino && nomeFinal !== nomeDestino) {
        await client.query(
          `UPDATE pedidos_terminal SET nome = $1 WHERE comanda = $2 AND status = 0`,
          [nomeFinal, destino]
        )
      }

      await client.query(CREATE_MERGE_LOG)
      await client.query(
        `INSERT INTO merge_log (comanda_origem, comanda_destino, nome_origem, nome_destino, itens_movidos, usuario)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [String(origem), String(destino), nomeOrigem, nomeDestino, movedItems.map((i: any) => i.id).join(','), `garcom:${vendedor.codigo}`]
      )

      return {
        movidos: upd.rowCount || movedItems.length,
        movedItems,
        nomeOrigem,
        nomeDestino,
        nomeFinal,
        itensDestinoAntes: itensAntesDestino.length,
      }
    })

    return NextResponse.json({
      success: true,
      message: `${out.movidos} itens movidos da comanda ${origem} → ${destino}`,
      origem,
      destino,
      ...out,
    })
  } catch (e: any) {
    console.error('[merge POST]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao unir comandas' }, { status: 500 })
  }
})
