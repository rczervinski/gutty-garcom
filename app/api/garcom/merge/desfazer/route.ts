import { NextRequest, NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { transaction } from '@/lib/database'

export const runtime = 'nodejs'

/** POST /api/garcom/merge/desfazer  Body: { id } — desfaz um merge (devolve os itens à origem, anexando). */
export const POST = withGarcom(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const id = parseInt(body?.id) || 0
  if (!id) return NextResponse.json({ success: false, error: 'ID do merge é obrigatório' }, { status: 400 })

  try {
    const out = await transaction(async (client) => {
      const sel = await client.query(`SELECT * FROM merge_log WHERE id = $1 AND status = 'ativo'`, [id])
      if (sel.rows.length === 0) throw new Error('Merge não encontrado ou já desfeito')

      const merge = sel.rows[0]
      const origem = parseInt(merge.comanda_origem) || 0
      const destino = parseInt(merge.comanda_destino) || 0
      const nomeOrigem = merge.nome_origem || ''
      const nomeDestino = merge.nome_destino || ''
      const codigos: number[] = String(merge.itens_movidos || '')
        .split(',')
        .map((s: string) => parseInt(s))
        .filter((n: number) => !!n)

      if (codigos.length === 0) throw new Error('Merge sem itens registrados')

      // Itens que vão voltar (diff), ainda no destino.
      const movedRes = await client.query(
        `SELECT pt.codigo, pt.qtde, pt.total, pt.obs,
                COALESCE((SELECT descricao FROM produtos WHERE codigo_gtin = pt.codigo_gtin LIMIT 1), pt.codigo_gtin) AS descricao
           FROM pedidos_terminal pt
          WHERE pt.codigo = ANY($1) AND pt.comanda = $2`,
        [codigos, destino]
      )
      const movedItems = movedRes.rows.map((row: any) => ({
        id: Number(row.codigo),
        descricao: row.descricao,
        qtde: Number(row.qtde) || 0,
        total: Number(row.total) || 0,
        obs: row.obs || '',
      }))

      // Base = maior item atual da origem; devolve anexando (sem colidir).
      const baseRes = await client.query(
        `SELECT COALESCE(MAX(item), 0) AS m FROM pedidos_terminal WHERE comanda = $1 AND status = 0`,
        [origem]
      )
      const base = Number(baseRes.rows[0]?.m) || 0

      const upd = await client.query(
        `WITH moved AS (
           SELECT codigo, ROW_NUMBER() OVER (ORDER BY item, codigo) AS rn
             FROM pedidos_terminal
            WHERE codigo = ANY($1) AND comanda = $2
         )
         UPDATE pedidos_terminal pt
            SET comanda = $3, mesa = $3, nome = $4, item = $5 + moved.rn
           FROM moved
          WHERE pt.codigo = moved.codigo`,
        [codigos, destino, origem, nomeOrigem || null, base]
      )

      // Restaura o nome dos itens que sobraram no destino.
      if (nomeDestino) {
        await client.query(
          `UPDATE pedidos_terminal SET nome = $1 WHERE comanda = $2 AND status = 0`,
          [nomeDestino, destino]
        )
      }

      await client.query(`UPDATE merge_log SET status = 'desfeito' WHERE id = $1`, [id])

      return { devolvidos: upd.rowCount || movedItems.length, movedItems, origem, destino }
    })

    return NextResponse.json({
      success: true,
      message: `${out.devolvidos} itens devolvidos da comanda ${out.destino} → ${out.origem}`,
      ...out,
    })
  } catch (e: any) {
    console.error('[merge desfazer]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao desfazer merge' }, { status: 500 })
  }
})
