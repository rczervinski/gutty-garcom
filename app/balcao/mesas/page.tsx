'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, ListOrdered, X, Armchair, ClipboardList, RefreshCw } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { apiBalcao } from '@/components/balcao/api'
import { brl, COR_PADRAO } from '@/components/balcao/theme'
import { horaDe, tempoRelativo } from '@/components/balcao/tipos'

type Pedido = {
  codigo: number; senha: number; status: string; total: number; criado_em: string
  cliente_nome: string | null
}
type Comanda = {
  codigo: number; numero: string; mesa_numero: number | null
  cliente_nome: string | null; total: number; total_pendente?: number
  pedidos?: Pedido[]; aberta_em: string
}
type Mesa = {
  codigo: number; numero: number; nome: string | null; aberta_em: string
  modo?: 'conta' | 'comandas' | 'vazia'
  total: number; total_pendente?: number
  comandas?: Comanda[]
  pedidos_diretos?: Pedido[]
  pedidos_avulsos?: Pedido[]
}

const STATUS: Record<string, { label: string; cls: string }> = {
  aguardando: { label: 'aguardando', cls: 'bg-slate-100 text-slate-600' },
  em_preparo: { label: 'em preparo', cls: 'bg-amber-100 text-amber-700' },
  pronto: { label: 'pronto', cls: 'bg-emerald-100 text-emerald-700' },
  entregue: { label: 'entregue', cls: 'bg-slate-100 text-slate-500' },
  cancelado: { label: 'cancelado', cls: 'bg-rose-50 text-rose-600' },
}

/**
 * O salão na mão do garçom: o que está aberto, quanto tem em cada conta e o
 * caminho de um toque pra lançar mais um pedido ali.
 */
export default function MesasPage() {
  const router = useRouter()
  const cor = COR_PADRAO

  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [itens, setItens] = useState<{ titulo: string; resumo: any; itens: any[] } | null>(null)
  const [carregandoItens, setCarregandoItens] = useState(false)

  const carregar = useCallback(async () => {
    const [dm, dc] = await Promise.all([apiBalcao.get('/mesas'), apiBalcao.get('/comandas?status=aberta')])
    if (!dm?.success && !dc?.success) setErro(dm?.error || 'Não deu pra carregar o salão agora.')
    else {
      setErro('')
      if (dm?.success) setMesas(dm.mesas || [])
      if (dc?.success) setComandas(dc.comandas || [])
    }
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function abrirItens(tipo: 'mesa' | 'comanda', codigo: number, titulo: string) {
    setItens({ titulo, resumo: null, itens: [] })
    setCarregandoItens(true)
    const d = await apiBalcao.get(`/${tipo === 'mesa' ? 'mesas' : 'comandas'}/${codigo}`)
    setCarregandoItens(false)
    if (!d?.success) { setItens(null); return }
    setItens({ titulo, resumo: d.comanda ?? d.mesa ?? null, itens: d.itens || [] })
  }

  function lancar(mesa?: number | null, comanda?: string | null) {
    const qs = new URLSearchParams()
    if (mesa != null) qs.set('mesa', String(mesa))
    if (comanda) qs.set('comanda', comanda)
    router.push(`/balcao/pedir${qs.toString() ? `?${qs.toString()}` : ''}`)
  }

  const pendente = (x: { total: number; total_pendente?: number }) =>
    typeof x.total_pendente === 'number' ? x.total_pendente : Number(x.total || 0)
  const pedidosDaMesa = (m: Mesa) => m.pedidos_diretos ?? m.pedidos_avulsos ?? []
  const semMesa = comandas.filter((c) => c.mesa_numero == null)
  const vazio = mesas.length === 0 && semMesa.length === 0

  const btn = (principal?: boolean) =>
    `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition active:scale-[0.99] ${
      principal ? 'text-white' : 'border border-slate-300 bg-white text-slate-700'
    }`

  function blocoComanda(c: Comanda, dentroDaMesa: boolean) {
    return (
      <div key={c.codigo} className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Comanda {c.numero}
              {c.cliente_nome ? <span className="font-normal text-slate-500"> · {c.cliente_nome}</span> : null}
            </p>
            <p className="text-xs text-slate-400">
              aberta {tempoRelativo(c.aberta_em)}
              {!dentroDaMesa && c.mesa_numero != null ? ` · Mesa ${c.mesa_numero}` : ''}
            </p>
          </div>
          <p className="shrink-0 text-base font-bold" style={{ color: cor }}>{brl(pendente(c))}</p>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <button onClick={() => lancar(c.mesa_numero, c.numero)} className={btn(true)} style={{ backgroundColor: cor }}>
            <Plus size={16} /> Pedido
          </button>
          <button onClick={() => abrirItens('comanda', c.codigo, `Comanda ${c.numero}`)} className={btn()}>
            <ListOrdered size={16} /> Itens
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      <AppHeader
        title="Mesas e comandas"
        back="/balcao"
        right={
          <button onClick={carregar} aria-label="Atualizar" className="grid h-11 w-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <RefreshCw size={18} />
          </button>
        }
      />

      <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-4">
        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
        ) : erro ? (
          <p className="py-16 text-center text-sm text-slate-400">{erro}</p>
        ) : vazio ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Armchair size={28} />
            </div>
            <p className="text-base font-semibold text-slate-900">Salão vazio</p>
            <p className="mt-1 text-sm text-slate-500">A mesa abre sozinha quando você lança o primeiro pedido nela.</p>
            <button
              onClick={() => lancar()}
              className="mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-xl px-5 text-sm font-bold text-white active:scale-[0.99]"
              style={{ backgroundColor: cor }}
            >
              <Plus size={18} /> Anotar pedido
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {mesas.map((m) => {
                const diretos = pedidosDaMesa(m).filter((p) => p.status !== 'cancelado')
                const modo = m.modo ?? ((m.comandas || []).length > 0 ? 'comandas' : diretos.length > 0 ? 'conta' : 'vazia')
                return (
                  <section key={m.codigo} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: cor }}>
                        <span className="text-lg font-extrabold leading-none">{m.numero}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">{m.nome || `Mesa ${m.numero}`}</p>
                        <p className="text-xs text-slate-400">
                          {modo === 'conta' ? 'Conta na mesa' : `${(m.comandas || []).length} comanda(s)`} · aberta {tempoRelativo(m.aberta_em)}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-extrabold" style={{ color: cor }}>{brl(pendente(m))}</p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {modo === 'conta' ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Pedidos na mesa</p>
                          {diretos.length === 0 ? (
                            <p className="py-1 text-xs text-slate-400">Nada lançado ainda.</p>
                          ) : (
                            diretos.map((p) => {
                              const st = STATUS[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' }
                              return (
                                <div key={p.codigo} className="flex items-center gap-2 py-1 text-sm">
                                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">{p.senha}</span>
                                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                                  <span className="ml-auto font-semibold text-slate-700">{brl(p.total)}</span>
                                </div>
                              )
                            })
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <button onClick={() => lancar(m.numero)} className={btn(true)} style={{ backgroundColor: cor }}>
                              <Plus size={16} /> Pedido
                            </button>
                            <button onClick={() => abrirItens('mesa', m.codigo, `Mesa ${m.numero}`)} className={btn()}>
                              <ListOrdered size={16} /> Itens
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {(m.comandas || []).map((c) => blocoComanda(c, true))}
                          <button onClick={() => lancar(m.numero)} className={`${btn(true)} w-full`} style={{ backgroundColor: cor }}>
                            <Plus size={16} /> Pedido nesta mesa
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>

            {semMesa.length > 0 && (
              <section>
                <h2 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <ClipboardList size={14} /> Comandas sem mesa
                </h2>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{semMesa.map((c) => blocoComanda(c, false))}</div>
              </section>
            )}

            <button
              onClick={() => lancar()}
              className="min-h-[52px] w-full rounded-xl border-2 bg-white text-sm font-bold active:scale-[0.99]"
              style={{ borderColor: cor, color: cor }}
            >
              Anotar pedido avulso
            </button>
          </>
        )}
      </div>

      {/* Itens já lançados */}
      {itens && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setItens(null)}>
          <div
            className="flex max-h-[85%] w-full max-w-lg animate-fade-in-up flex-col rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h3 className="truncate text-base font-semibold text-slate-900">{itens.titulo}</h3>
              <button onClick={() => setItens(null)} aria-label="Fechar" className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {carregandoItens ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
              ) : itens.itens.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Nenhum item lançado ainda.</p>
              ) : (
                <>
                  {(itens.resumo?.pedidos || [])
                    .filter((p: Pedido) => p.status !== 'cancelado')
                    .map((ped: Pedido) => {
                      const doPedido = itens.itens.filter(
                        (it: any) => String(it.pedido ?? it.pedido_senha) === String(ped.codigo) || String(it.pedido_senha) === String(ped.senha)
                      )
                      const st = STATUS[ped.status] || { label: ped.status, cls: 'bg-slate-100 text-slate-600' }
                      return (
                        <div key={ped.codigo} className="mb-2 rounded-xl border border-slate-200 p-3">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">{ped.senha}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                            <span className="text-[11px] text-slate-400">{horaDe(ped.criado_em)}</span>
                            <span className="ml-auto text-sm font-bold text-slate-900">{brl(ped.total)}</span>
                          </div>
                          {doPedido.map((it: any) => (
                            <div key={it.codigo} className={`py-0.5 text-sm ${it.combo_pai != null ? 'pl-3' : ''}`}>
                              <div className="flex justify-between gap-2">
                                <span className={it.combo_pai != null ? 'text-slate-500' : 'text-slate-800'}>
                                  {it.combo_pai != null ? '↳ ' : <b>{Number(it.quantidade)}x </b>}{it.nome}
                                </span>
                                {it.combo_pai == null && <span className="shrink-0 text-slate-500">{brl(it.subtotal)}</span>}
                              </div>
                              {Array.isArray(it.modificadores) && it.modificadores.length > 0 && (
                                <p className="pl-4 text-xs text-slate-500">{it.modificadores.map((m: any) => m.modificador_nome).join(', ')}</p>
                              )}
                              {it.observacao && <p className="pl-4 text-xs text-amber-600">Obs: {it.observacao}</p>}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                    <span>Total</span><span>{brl(itens.resumo?.total)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
