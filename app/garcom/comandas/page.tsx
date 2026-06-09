'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { apiGet, brl } from '@/lib/client-api'

type Comanda = { comanda: number; nome: string; totalItens: number; valorTotal: number; descricao: string }
type Item = { id: number; descricao: string; qtde: number; valor: number; total: number; obs: string }

export default function ComandasPage() {
  const [lista, setLista] = useState<Comanda[]>([])
  const [loading, setLoading] = useState(true)
  const [aberta, setAberta] = useState<number | null>(null)
  const [itens, setItens] = useState<Item[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const j = await apiGet('/api/garcom/comandas')
      setLista(j.data || [])
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar comandas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function toggle(num: number) {
    if (aberta === num) {
      setAberta(null)
      return
    }
    setAberta(num)
    setLoadingItens(true)
    setItens([])
    try {
      const j = await apiGet(`/api/garcom/comandas?numero=${num}`)
      setItens(j.data?.itens || [])
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar itens')
    } finally {
      setLoadingItens(false)
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <AppHeader
        title="Comandas abertas"
        back="/garcom"
        right={
          <button onClick={carregar} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Atualizar">
            <RefreshCw size={18} />
          </button>
        }
      />

      {loading ? (
        <div className="grid place-items-center py-20 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <p className="px-4 py-16 text-center text-slate-400">Nenhuma comanda aberta</p>
      ) : (
        <ul className="space-y-2 p-3">
          {lista.map((c) => (
            <li key={`${c.comanda}-${c.nome}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <button onClick={() => toggle(c.comanda)} className="flex w-full items-center gap-3 p-4 text-left">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 font-bold text-primary-700">
                  {c.comanda}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{c.nome || `Comanda ${c.comanda}`}</p>
                  <p className="text-sm text-slate-500">{c.totalItens} {c.totalItens === 1 ? 'item' : 'itens'} · {brl(c.valorTotal)}</p>
                </div>
                {aberta === c.comanda ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>

              {aberta === c.comanda && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  {loadingItens ? (
                    <div className="grid place-items-center py-4 text-slate-400">
                      <Loader2 className="animate-spin" size={18} />
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {itens.map((it) => (
                        <li key={it.id} className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            {it.qtde}x {it.descricao}
                            {it.obs ? <span className="text-slate-400"> · {it.obs}</span> : null}
                          </span>
                          <span className="font-medium text-slate-800">{brl(it.total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
