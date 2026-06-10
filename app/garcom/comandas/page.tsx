'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp, RefreshCw, Search, PlusCircle } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { apiGet, brl } from '@/lib/client-api'
import { setTargetComanda } from '@/lib/target-comanda'

type Comanda = { comanda: number; nome: string; totalItens: number; valorTotal: number; descricao: string }
type Item = { id: number; descricao: string; qtde: number; valor: number; total: number; obs: string }

export default function ComandasPage() {
  const router = useRouter()
  const [lista, setLista] = useState<Comanda[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
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

  function adicionarItens(c: Comanda) {
    setTargetComanda({ comanda: c.comanda, nome: c.nome })
    toast.success(`Lançando na comanda ${c.comanda}`)
    router.push('/garcom/categorias')
  }

  const vis = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    if (!f) return lista
    return lista.filter((c) => String(c.comanda).includes(f) || (c.nome || '').toLowerCase().includes(f))
  }, [lista, filtro])

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

      <div className="mx-auto w-full max-w-5xl">
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por número ou nome"
            className="min-h-11 w-full bg-transparent py-2.5 text-base outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : vis.length === 0 ? (
        <p className="px-4 py-16 text-center text-slate-400">
          {lista.length === 0 ? 'Nenhuma comanda aberta' : 'Nenhuma comanda encontrada'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-2 px-3 lg:grid-cols-2">
          {vis.map((c) => (
            <li key={`${c.comanda}-${c.nome}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggle(c.comanda)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 font-bold text-primary-700">
                    {c.comanda}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{c.nome || `Comanda ${c.comanda}`}</p>
                    <p className="text-sm text-slate-500">
                      {c.totalItens} {c.totalItens === 1 ? 'item' : 'itens'} · {brl(c.valorTotal)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => adicionarItens(c)}
                  className="grid h-11 w-11 place-items-center rounded-lg bg-primary-600 text-white active:scale-95"
                  aria-label={`Adicionar itens na comanda ${c.comanda}`}
                >
                  <PlusCircle size={20} />
                </button>
                <button onClick={() => toggle(c.comanda)} className="grid h-8 w-8 place-items-center text-slate-400" aria-label="Detalhes">
                  {aberta === c.comanda ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

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
      </div>
    </main>
  )
}
