'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, GitMerge, Undo2, ArrowRight, ListOrdered } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import ComandaPicker, { ComandaAberta } from '@/components/ComandaPicker'
import { apiGet, apiPost, brl } from '@/lib/client-api'

type Merge = {
  id: number
  comandaOrigem: string
  comandaDestino: string
  nomeOrigem: string
  nomeDestino: string
  status: string
}
type MovedItem = { id: number; descricao: string; qtde: number; obs: string }
type Resultado = {
  tipo: 'merge' | 'undo'
  origem: number
  destino: number
  count: number
  movedItems: MovedItem[]
  nomeFinal?: string
}

export default function UnirPage() {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [abertas, setAbertas] = useState<ComandaAberta[]>([])
  const [recentes, setRecentes] = useState<Merge[]>([])
  const [unindo, setUnindo] = useState(false)
  const [pickerFor, setPickerFor] = useState<'origem' | 'destino' | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

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

  function onPick(c: ComandaAberta) {
    if (pickerFor === 'origem') setOrigem(String(c.comanda))
    else if (pickerFor === 'destino') setDestino(String(c.comanda))
    setPickerFor(null)
  }

  async function unir() {
    if (!origem || !destino) return toast.error('Informe origem e destino')
    if (origem === destino) return toast.error('Origem e destino iguais')
    setUnindo(true)
    try {
      const j = await apiPost('/api/garcom/merge', { origem, destino })
      toast.success(j.message || 'Comandas unidas')
      setResultado({
        tipo: 'merge',
        origem: j.origem,
        destino: j.destino,
        count: j.movidos,
        movedItems: j.movedItems || [],
        nomeFinal: j.nomeFinal || '',
      })
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
      setResultado({
        tipo: 'undo',
        origem: j.origem,
        destino: j.destino,
        count: j.devolvidos,
        movedItems: j.movedItems || [],
      })
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
              list="abertas-origem"
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
              list="abertas-destino"
              placeholder="Para"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        {/* datalists dinâmicos com as comandas abertas */}
        <datalist id="abertas-origem">
          {abertas.map((a) => (
            <option key={a.comanda} value={a.comanda}>{a.nome || `Comanda ${a.comanda}`}</option>
          ))}
        </datalist>
        <datalist id="abertas-destino">
          {abertas.map((a) => (
            <option key={a.comanda} value={a.comanda}>{a.nome || `Comanda ${a.comanda}`}</option>
          ))}
        </datalist>

        <div className="flex gap-2">
          <button
            onClick={() => setPickerFor('origem')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 active:scale-95"
          >
            <ListOrdered size={16} /> Escolher origem
          </button>
          <button
            onClick={() => setPickerFor('destino')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 active:scale-95"
          >
            <ListOrdered size={16} /> Escolher destino
          </button>
        </div>

        <button
          onClick={unir}
          disabled={unindo}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-semibold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
        >
          {unindo ? <Loader2 className="animate-spin" size={20} /> : <GitMerge size={20} />}
          Unir comandas
        </button>
      </div>

      {/* Diff da última ação */}
      {resultado && (
        <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card animate-fade-in">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            {resultado.tipo === 'merge' ? <GitMerge size={16} className="text-amber-600" /> : <Undo2 size={16} className="text-slate-600" />}
            {resultado.tipo === 'merge'
              ? `Comanda ${resultado.origem} → ${resultado.destino}`
              : `Desfeito: ${resultado.destino} → ${resultado.origem}`}
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{resultado.count} itens</span>
          </div>
          {resultado.nomeFinal ? (
            <p className="mb-2 text-xs text-slate-500">Nome da comanda: <b>{resultado.nomeFinal}</b></p>
          ) : null}
          <ul className="space-y-1">
            {resultado.movedItems.map((it) => (
              <li key={it.id} className="text-sm">
                <span className="text-slate-700">{it.qtde}x {it.descricao}</span>
                {it.obs ? <span className="text-xs italic text-amber-700"> · {it.obs}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                    {m.comandaOrigem}{m.nomeOrigem ? ` (${m.nomeOrigem})` : ''} → {m.comandaDestino}{m.nomeDestino ? ` (${m.nomeDestino})` : ''}
                  </p>
                  <p className={m.status === 'desfeito' ? 'text-slate-400' : 'text-emerald-600'}>
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

      <ComandaPicker open={pickerFor !== null} abertas={abertas} onPick={onPick} onClose={() => setPickerFor(null)} />
    </main>
  )
}
