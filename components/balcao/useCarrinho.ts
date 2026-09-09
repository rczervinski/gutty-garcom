'use client'

import { useCallback, useMemo, useState } from 'react'
import { itensDoPedido, type LinhaCarrinho } from './tipos'

export type Carrinho = {
  itens: LinhaCarrinho[]
  subtotal: number
  qtdeTotal: number
  adicionar: (linha: LinhaCarrinho) => void
  mudarQtde: (id: string, delta: number) => void
  remover: (id: string) => void
  limpar: () => void
  /** Serializa pro corpo do POST /pedidos. */
  paraPedido: () => any[]
}

/**
 * Carrinho no MESMO formato do storefront (`LinhaCarrinho`) — é isso que permite
 * reaproveitar ProdutoView/ComboView e mandar combos com componentes pro servidor
 * sem tradução no meio.
 */
export function useCarrinho(): Carrinho {
  const [itens, setItens] = useState<LinhaCarrinho[]>([])

  const adicionar = useCallback((linha: LinhaCarrinho) => setItens((c) => [...c, linha]), [])
  const mudarQtde = useCallback((id: string, delta: number) => {
    // Teto de 99 e some ao zerar — o mesmo do app do cliente.
    setItens((c) => c.map((x) => (x.id === id ? { ...x, qtde: Math.min(99, x.qtde + delta) } : x)).filter((x) => x.qtde > 0))
  }, [])
  const remover = useCallback((id: string) => setItens((c) => c.filter((x) => x.id !== id)), [])
  const limpar = useCallback(() => setItens([]), [])

  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.precoUnit * i.qtde, 0), [itens])
  const qtdeTotal = useMemo(() => itens.reduce((s, i) => s + i.qtde, 0), [itens])
  const paraPedido = useCallback(() => itensDoPedido(itens), [itens])

  return { itens, subtotal, qtdeTotal, adicionar, mudarQtde, remover, limpar, paraPedido }
}
