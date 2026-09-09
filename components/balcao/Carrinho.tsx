'use client'

import { Minus, Plus, Trash2, ShoppingBag, X } from 'lucide-react'
import { brl, COR_PADRAO } from './theme'
import type { Carrinho as CarrinhoState } from './useCarrinho'

/** Linhas do pedido atual: qtde ±, remover, complementos e observação. */
export function LinhasCarrinho({ carrinho }: { carrinho: CarrinhoState }) {
  if (carrinho.itens.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Nenhum item ainda.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {carrinho.itens.map((i) => (
        <div key={i.id} className="flex items-start gap-2 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{i.qtde}x {i.nome}</p>
            {i.modsResumo && <p className="text-xs text-slate-500">{i.modsResumo}</p>}
            {i.observacao && <p className="text-xs text-amber-600">Obs: {i.observacao}</p>}
            <p className="mt-0.5 text-sm font-bold text-slate-900">{brl(i.precoUnit * i.qtde)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => carrinho.mudarQtde(i.id, -1)}
              aria-label="Diminuir"
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 active:scale-95"
            >
              <Minus size={16} />
            </button>
            <span className="w-6 text-center text-sm font-bold">{i.qtde}</span>
            <button
              onClick={() => carrinho.mudarQtde(i.id, 1)}
              aria-label="Aumentar"
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 active:scale-95"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => carrinho.remover(i.id)}
              aria-label="Remover"
              className="grid h-11 w-11 place-items-center rounded-xl border border-rose-100 text-rose-500 active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Total + ação principal. Fica colado embaixo do painel. */
export function RodapeCarrinho({
  carrinho, onFinalizar, rotulo = 'Continuar', cor = COR_PADRAO,
}: {
  carrinho: CarrinhoState
  onFinalizar: () => void
  rotulo?: string
  cor?: string
}) {
  return (
    <div className="safe-bottom border-t border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {carrinho.qtdeTotal} {carrinho.qtdeTotal === 1 ? 'item' : 'itens'}
        </span>
        <span className="text-lg font-bold text-slate-900">{brl(carrinho.subtotal)}</span>
      </div>
      <button
        onClick={onFinalizar}
        disabled={carrinho.itens.length === 0}
        className="min-h-[52px] w-full rounded-xl text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
        style={{ backgroundColor: cor }}
      >
        {rotulo}
      </button>
    </div>
  )
}

/**
 * Painel do pedido atual: coluna fixa no tablet/totem/PC e tela cheia no celular.
 * Mesmo conteúdo nos dois — muda só onde ele mora (DESIGN.md).
 */
export default function Carrinho({
  carrinho, onFinalizar, onFechar, rotuloBotao, cor = COR_PADRAO,
}: {
  carrinho: CarrinhoState
  onFinalizar: () => void
  onFechar?: () => void
  rotuloBotao?: string
  cor?: string
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShoppingBag size={16} className="text-slate-400" /> Pedido atual
        </h2>
        {onFechar && (
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4"><LinhasCarrinho carrinho={carrinho} /></div>
      <RodapeCarrinho carrinho={carrinho} onFinalizar={onFinalizar} rotulo={rotuloBotao} cor={cor} />
    </div>
  )
}
