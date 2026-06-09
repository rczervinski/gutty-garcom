import { NextRequest, NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { transaction } from '@/lib/database'

export const runtime = 'nodejs'

/** POST /api/garcom/merge/desfazer  Body: { id } — desfaz um merge. */
export const POST = withGarcom(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const id = parseInt(body?.id) || 0
  if (!id) return NextResponse.json({ success: false, error: 'ID do merge é obrigatório' }, { status: 400 })

  try {
    const result = await transaction(async (client) => {
      const sel = await client.query(`SELECT * FROM merge_log WHERE id = $1 AND status = 'ativo'`, [id])
      if (sel.rows.length === 0) throw new Error('Merge não encontrado ou já desfeito')

      const merge = sel.rows[0]
      const origem = merge.comanda_origem
      const destino = merge.comanda_destino
      const nomeOrigem = merge.nome_origem || ''
      const nomeDestino = merge.nome_destino || ''
      const itens: string[] = String(merge.itens_movidos || '').split(',').filter(Boolean)

      const upd = await client.query(
        `UPDATE pedidos_terminal SET comanda = $1, mesa = $1, nome = $2
          WHERE codigo = ANY($3) AND comanda = $4`,
        [origem, nomeOrigem || null, itens, destino]
      )

      if (nomeDestino) {
        await client.query(
          `UPDATE pedidos_terminal SET nome = $1 WHERE comanda = $2 AND status = 0`,
          [nomeDestino, destino]
        )
      }

      await client.query(`UPDATE merge_log SET status = 'desfeito' WHERE id = $1`, [id])
      return upd.rowCount || itens.length
    })

    return NextResponse.json({ success: true, message: `${result} itens devolvidos` })
  } catch (e: any) {
    console.error('[merge desfazer]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao desfazer merge' }, { status: 500 })
  }
})
