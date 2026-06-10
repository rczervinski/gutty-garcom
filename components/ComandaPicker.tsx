'use client'

import { useMemo, useState } from 'react'
import { X, Search, ListOrdered, Eye, Loader2 } from 'lucide-react'
import { apiGet, brl } from '@/lib/client-api'

export type ComandaAberta = {
  comanda: number
  nome: string
  totalItens: number
  valorTotal: number
  descricao: string
}

type ItemComanda = { id: number; descricao: string; qtde: number; total: number; obs: string }

/**
 * Bottom-sheet com busca para escolher uma comanda aberta — por número OU nome.
 * Cada comanda tem um botão de "olho" para visualizar os itens (com obs) antes de escolher.
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
  const [verComanda, setVerComanda] = useState<number | null>(null)
  const [itens, setItens] = useState<ItemComanda[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  const vis = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return abertas
    return abertas.filter((a) => String(a.comanda).includes(f) || (a.nome || '').toLowerCase().includes(f))
  }, [q, abertas])

  async function toggleVer(num: number) {
    if (verComanda === num) {
      setVerComanda(null)
      return
    }
    setVerComanda(num)
    setItens([])
    setLoadingItens(true)
    try {
      const j = await apiGet(`/api/garcom/comandas?numero=${num}`)
      setItens(j.data?.itens || [])
    } catch {
      setItens([])
    } finally {
      setLoadingItens(false)
    }
  }

  if (!open) return null

  return (
    // Celular: bottom sheet. Tablet/totem/PC: modal centrado.
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Escolher comanda aberta">
      <div
        className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white animate-fade-in-up sm:max-h-[70vh] sm:rounded-2xl sm:shadow-elevated"
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
              <li key={`${a.comanda}-${a.nome}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                <div className="flex items-center gap-2 p-2">
                  <button onClick={() => onPick(a)} className="flex min-w-0 flex-1 items-center gap-3 p-1 text-left">
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
                  <button
                    onClick={() => toggleVer(a.comanda)}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${verComanda === a.comanda ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    aria-label="Ver itens"
                  >
                    <Eye size={18} />
                  </button>
                </div>

                {verComanda === a.comanda && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
                    {loadingItens ? (
                      <div className="grid place-items-center py-3 text-slate-400">
                        <Loader2 className="animate-spin" size={16} />
                      </div>
                    ) : (
                      <ul className="space-y-1 py-1">
                        {itens.map((it) => (
                          <li key={it.id} className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-700">{it.qtde}x {it.descricao}</span>
                              <span className="font-medium text-slate-800">{brl(it.total)}</span>
                            </div>
                            {it.obs ? <p className="text-xs italic text-amber-700">↳ {it.obs}</p> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
