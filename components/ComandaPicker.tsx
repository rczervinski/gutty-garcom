'use client'

import { useMemo, useState } from 'react'
import { X, Search, ListOrdered } from 'lucide-react'
import { brl } from '@/lib/client-api'

export type ComandaAberta = {
  comanda: number
  nome: string
  totalItens: number
  valorTotal: number
  descricao: string
}

/**
 * Bottom-sheet com busca para escolher uma comanda aberta — por número OU nome.
 * Espelha o showTablesList/showCustomersList do app Cielo, unificado e buscável.
 */
export default function ComandaPicker({
  open,
  abertas,
  onPick,
  onClose,
}: {
  open: boolean
  abertas: ComandaAberta[]
  onPick: (c: ComandaAberta) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')

  const vis = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return abertas
    return abertas.filter((a) => String(a.comanda).includes(f) || (a.nome || '').toLowerCase().includes(f))
  }, [q, abertas])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-auto flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <ListOrdered size={18} /> Comandas abertas
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Buscar por número ou nome"
              className="w-full bg-transparent py-2.5 text-base outline-none"
            />
          </div>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto px-3 pb-5">
          {vis.length === 0 ? (
            <li className="py-10 text-center text-sm text-slate-400">Nenhuma comanda aberta</li>
          ) : (
            vis.map((a) => (
              <li key={`${a.comanda}-${a.nome}`}>
                <button
                  onClick={() => onPick(a)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card active:scale-[0.99]"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 font-bold text-primary-700">
                    {a.comanda}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{a.nome || `Comanda ${a.comanda}`}</p>
                    <p className="text-sm text-slate-500">
                      {a.totalItens} {a.totalItens === 1 ? 'item' : 'itens'} · {brl(a.valorTotal)}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
