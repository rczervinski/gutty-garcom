'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, GitMerge, Undo2, ArrowRight } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { apiGet, apiPost } from '@/lib/client-api'

type Comanda = { comanda: number; nome: string; descricao: string }
type Merge = {
  id: number
  comandaOrigem: string
  comandaDestino: string
  nomeOrigem: string
  nomeDestino: string
  status: string
}

export default function UnirPage() {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [abertas, setAbertas] = useState<Comanda[]>([])
  const [recentes, setRecentes] = useState<Merge[]>([])
  const [unindo, setUnindo] = useState(false)

  async function carregar() {
    try {
      const [a, m] = await Promise.all([apiGet('/api/garcom/comandas'), apiGet('/api/garcom/merge')])
      setAbertas(a.data || [])
      setRecentes(m.data || [])
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar')
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function unir() {
    if (!origem || !destino) return toast.error('Informe origem e destino')
    if (origem === destino) return toast.error('Origem e destino iguais')
    setUnindo(true)
    try {
      const j = await apiPost('/api/garcom/merge', { origem, destino })
      toast.success(j.message || 'Comandas unidas')
      setOrigem('')
      setDestino('')
      carregar()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao unir')
    } finally {
      setUnindo(false)
    }
  }

  async function desfazer(id: number) {
    try {
      const j = await apiPost('/api/garcom/merge/desfazer', { id })
      toast.success(j.message || 'Merge desfeito')
      carregar()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao desfazer')
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <AppHeader title="Unir comandas" back="/garcom" />

      <div className="space-y-4 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Origem</label>
            <input
              value={origem}
              onChange={(e) => setOrigem(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="De"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <ArrowRight className="mb-3 text-slate-400" size={20} />
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Destino</label>
            <input
              value={destino}
              onChange={(e) => setDestino(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="Para"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        {abertas.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {abertas.map((a) => (
              <button
                key={`${a.comanda}-${a.nome}`}
                onClick={() => (!origem ? setOrigem(String(a.comanda)) : setDestino(String(a.comanda)))}
                className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 active:scale-95"
              >
                {a.descricao}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={unir}
          disabled={unindo}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-semibold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
        >
          {unindo ? <Loader2 className="animate-spin" size={20} /> : <GitMerge size={20} />}
          Unir comandas
        </button>
      </div>

      <div className="px-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Merges recentes (24h)</h2>
        {recentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum merge recente</p>
        ) : (
          <ul className="space-y-2">
            {recentes.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-slate-800">
                    {m.comandaOrigem} → {m.comandaDestino}
                  </p>
                  <p className="text-slate-500">
                    {m.status === 'desfeito' ? 'Desfeito' : 'Ativo'}
                  </p>
                </div>
                {m.status === 'ativo' && (
                  <button
                    onClick={() => desfazer(m.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 active:scale-95"
                  >
                    <Undo2 size={16} /> Desfazer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
