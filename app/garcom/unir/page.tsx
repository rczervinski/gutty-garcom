'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, GitMerge, Undo2, ArrowRight, ListOrdered, Eye, PlusCircle, ShoppingBag } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import ComandaPicker, { ComandaAberta } from '@/components/ComandaPicker'
import { apiGet, apiPost, brl } from '@/lib/client-api'

type MovedItem = { id: number; descricao: string; qtde: number; total?: number; obs: string }
type Detalhes = {
  movedItems: MovedItem[]
  destinoAntes?: MovedItem[]
  nomeOrigem?: string
  nomeDestino?: string
  nomeFinal?: string
}
type Merge = {
  id: number
  comandaOrigem: string
  comandaDestino: string
  nomeOrigem: string
  nomeDestino: string
  status: string
  detalhes: Detalhes | null
}
type Resultado = {
  tipo: 'merge' | 'undo'
  origem: number
  destino: number
  detalhes: Detalhes
}

function soma(itens?: MovedItem[]) {
  return (itens || []).reduce((s, i) => s + (i.total || 0), 0)
}

/** Diff amigável de um merge: o que entrou, o que já tinha, como ficou. */
function MergeDiff({ origem, destino, detalhes, desfeito }: { origem: string | number; destino: string | number; detalhes: Detalhes; desfeito?: boolean }) {
  const entrou = detalhes.movedItems || []
  const jaTinha = detalhes.destinoAntes
  const totalEntrou = soma(entrou)
  const totalJaTinha = soma(jaTinha)

  return (
    <div className="space-y-3 text-sm">
      {/* O que entrou */}
      <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-primary-800">
          <PlusCircle size={15} />
          {desfeito ? 'Itens que tinham entrado' : 'Entrou'} da comanda {origem}
          {detalhes.nomeOrigem ? ` (${detalhes.nomeOrigem})` : ''} · {entrou.length} {entrou.length === 1 ? 'item' : 'itens'}
          {totalEntrou > 0 ? ` · ${brl(totalEntrou)}` : ''}
        </p>
        <ul className="space-y-0.5">
          {entrou.map((it) => (
            <li key={it.id} className="flex justify-between gap-2 text-primary-900">
              <span>
                {it.qtde}x {it.descricao}
                {it.obs ? <span className="text-xs italic text-amber-700"> · {it.obs}</span> : null}
              </span>
              {it.total ? <span className="shrink-0 font-medium">{brl(it.total)}</span> : null}
            </li>
          ))}
        </ul>
      </div>

      {/* O que já tinha no destino */}
      {jaTinha && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-700">
            <ShoppingBag size={15} />
            Já tinha na comanda {destino}
            {detalhes.nomeDestino ? ` (${detalhes.nomeDestino})` : ''} · {jaTinha.length} {jaTinha.length === 1 ? 'item' : 'itens'}
            {totalJaTinha > 0 ? ` · ${brl(totalJaTinha)}` : ''}
          </p>
          {jaTinha.length === 0 ? (
            <p className="text-slate-500">Comanda estava vazia (nova).</p>
          ) : (
            <ul className="space-y-0.5">
              {jaTinha.map((it) => (
                <li key={it.id} className="flex justify-between gap-2 text-slate-700">
                  <span>
                    {it.qtde}x {it.descricao}
                    {it.obs ? <span className="text-xs italic text-amber-700"> · {it.obs}</span> : null}
                  </span>
                  {it.total ? <span className="shrink-0 font-medium">{brl(it.total)}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Como ficou */}
      {jaTinha && !desfeito && (
        <div className="flex items-center justify-between rounded-lg bg-stone-900 px-3 py-2 text-white">
          <span className="font-medium">
            Comanda {destino}
            {detalhes.nomeFinal ? ` · ${detalhes.nomeFinal}` : ''} ficou com {entrou.length + jaTinha.length} itens
          </span>
          <span className="font-bold">{brl(totalEntrou + totalJaTinha)}</span>
        </div>
      )}
      {desfeito && (
        <p className="text-xs text-slate-500">Este merge foi desfeito — os itens voltaram para a comanda {origem}.</p>
      )}
    </div>
  )
}

export default function UnirPage() {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [abertas, setAbertas] = useState<ComandaAberta[]>([])
  const [recentes, setRecentes] = useState<Merge[]>([])
  const [unindo, setUnindo] = useState(false)
  const [pickerFor, setPickerFor] = useState<'origem' | 'destino' | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [verMerge, setVerMerge] = useState<number | null>(null)

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
        detalhes: {
          movedItems: j.movedItems || [],
          destinoAntes: j.destinoAntes || [],
          nomeOrigem: j.nomeOrigem || '',
          nomeDestino: j.nomeDestino || '',
          nomeFinal: j.nomeFinal || '',
        },
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
        detalhes: { movedItems: j.movedItems || [] },
      })
      setVerMerge(null)
      carregar()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao desfazer')
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <AppHeader title="Unir comandas" back="/garcom" />

      {/* Celular: empilhado. PC/totem: formulário+resultado | recentes. */}
      <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:px-4 lg:pt-4">
      <div>
      <div className="space-y-4 p-4 lg:p-0">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-semibold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
        >
          {unindo ? <Loader2 className="animate-spin" size={20} /> : <GitMerge size={20} />}
          Unir comandas
        </button>
      </div>

      {/* Resultado da última ação (unir/desfazer) */}
      {resultado && (
        <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card animate-fade-in lg:mx-0 lg:mt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            {resultado.tipo === 'merge' ? <GitMerge size={16} className="text-primary-600" /> : <Undo2 size={16} className="text-slate-600" />}
            {resultado.tipo === 'merge'
              ? `Comanda ${resultado.origem} → ${resultado.destino}`
              : `Desfeito: itens voltaram para a comanda ${resultado.origem}`}
          </div>
          {resultado.tipo === 'merge' ? (
            <MergeDiff origem={resultado.origem} destino={resultado.destino} detalhes={resultado.detalhes} />
          ) : (
            <ul className="space-y-0.5 text-sm">
              {resultado.detalhes.movedItems.map((it) => (
                <li key={it.id} className="flex justify-between gap-2 text-slate-700">
                  <span>
                    {it.qtde}x {it.descricao}
                    {it.obs ? <span className="text-xs italic text-amber-700"> · {it.obs}</span> : null}
                  </span>
                  {it.total ? <span className="shrink-0 font-medium">{brl(it.total)}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </div>

      <div className="px-4 lg:px-0">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Merges recentes (24h)</h2>
        {recentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum merge recente</p>
        ) : (
          <ul className="space-y-2">
            {recentes.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-slate-800">
                      {m.comandaOrigem}{m.nomeOrigem ? ` (${m.nomeOrigem})` : ''} → {m.comandaDestino}{m.nomeDestino ? ` (${m.nomeDestino})` : ''}
                    </p>
                    <p className={m.status === 'desfeito' ? 'text-slate-400' : 'text-emerald-600'}>
                      {m.status === 'desfeito' ? 'Desfeito' : 'Ativo'}
                    </p>
                  </div>
                  <button
                    onClick={() => setVerMerge(verMerge === m.id ? null : m.id)}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${verMerge === m.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    aria-label="Visualizar merge"
                  >
                    <Eye size={16} />
                  </button>
                  {m.status === 'ativo' && (
                    <button
                      onClick={() => desfazer(m.id)}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 active:scale-95"
                    >
                      <Undo2 size={16} /> Desfazer
                    </button>
                  )}
                </div>

                {verMerge === m.id && (
                  <div className="border-t border-slate-100 px-3 py-3">
                    {m.detalhes ? (
                      <MergeDiff
                        origem={m.comandaOrigem}
                        destino={m.comandaDestino}
                        detalhes={m.detalhes}
                        desfeito={m.status === 'desfeito'}
                      />
                    ) : (
                      <p className="text-sm text-slate-400">Sem detalhes registrados (merge antigo).</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      <ComandaPicker open={pickerFor !== null} abertas={abertas} onPick={onPick} onClose={() => setPickerFor(null)} />
    </main>
  )
}
