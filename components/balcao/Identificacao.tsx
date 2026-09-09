'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Lock, Armchair, ClipboardList, AlertTriangle, Plus, ShoppingBag } from 'lucide-react'
import { COR_PADRAO } from './theme'
import {
  mascararCpf, mascararFone, soDigitos,
  type ApiPedido, type ComandaAberta, type Identificacao as IdentResposta,
  type IdentificacaoValor, type MesaAberta, type PrefillPedido,
} from './tipos'

/**
 * Em qual comanda esse pedido entra (contrato §10 e §10.1).
 *
 * A comanda é o centro de gravidade do app: quem resolve mesa × comanda é o
 * servidor, e esta tela obedece. Ela preenche e TRAVA o cliente da comanda/mesa,
 * trava a mesa da comanda escolhida, desabilita a comanda quando a mesa é conta
 * direta e mostra o erro com a saída pronta ("Abrir comanda 3"). Nome é opcional.
 *
 * O salão aparece como LISTA (uma linha por mesa, comandas à direita) em vez de
 * chips soltos: com 10 mesas abertas, um monte de pílulas do mesmo tamanho não
 * diz mais onde termina uma mesa e começa a outra.
 */

/** Linha da lista "Abertas agora". */
type LinhaMesa = {
  codigo: number
  numero: number
  nome: string | null
  comandas: { codigo: number; numero: string; cliente_nome: string | null }[]
  proxima: string | null
}

/** Próxima comanda da mesa: maior número + 1 (§10). Sem número, sem sugestão. */
function proximaDaMesa(comandas: { numero: string }[]): string | null {
  const nums = comandas.map((c) => Number(c.numero)).filter((n) => Number.isFinite(n))
  return nums.length ? String(Math.max(...nums) + 1) : null
}

export default function Identificacao({
  api,
  prefill,
  onChange,
  erroServidor,
  cor = COR_PADRAO,
}: {
  api: ApiPedido
  prefill?: PrefillPedido | null
  /** Sobe o que mandar no POST (e se dá pra enviar) a cada mudança. */
  onChange: (v: IdentificacaoValor) => void
  /** 409 do POST — aparece no mesmo lugar da validação ao vivo. */
  erroServidor?: { mensagem: string; sugestao?: string | null } | null
  cor?: string
}) {
  const [nome, setNome] = useState(prefill?.cliente?.nome || '')
  const [fone, setFone] = useState(soDigitos(prefill?.cliente?.telefone || ''))
  const [cpf, setCpf] = useState(soDigitos(prefill?.cliente?.cpf || ''))
  const [mesa, setMesa] = useState(prefill?.mesa_numero != null ? String(prefill.mesa_numero) : '')
  const [comanda, setComanda] = useState(prefill?.comanda_numero || '')

  const [comandasAbertas, setComandasAbertas] = useState<ComandaAberta[]>([])
  const [mesasAbertas, setMesasAbertas] = useState<MesaAberta[]>([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [ident, setIdent] = useState<IdentResposta | null>(null)
  const [validando, setValidando] = useState(false)

  // O que o garçom digitou antes de ser travado, pra devolver ao destravar.
  const travado = useRef(false)
  const digitado = useRef<{ nome: string; fone: string; cpf: string } | null>(null)
  const mesaRef = useRef(mesa)
  useEffect(() => { mesaRef.current = mesa }, [mesa])
  // A validação é debounced: sem este ref, um nome digitado durante os 300ms
  // seria capturado vazio e perdido.
  const clienteRef = useRef({ nome, fone, cpf })
  useEffect(() => { clienteRef.current = { nome, fone, cpf } }, [nome, fone, cpf])

  const [erroExterno, setErroExterno] = useState<{ mensagem: string; sugestao?: string | null } | null>(null)
  useEffect(() => { setErroExterno(erroServidor || null) }, [erroServidor])

  useEffect(() => {
    let pendentes = 2
    const pronto = () => { pendentes -= 1; if (pendentes <= 0) setCarregandoLista(false) }
    api.get('/comandas?status=aberta').then((d) => { if (d?.success) setComandasAbertas(d.comandas || []) }).finally(pronto)
    api.get('/mesas').then((d) => { if (d?.success) setMesasAbertas(d.mesas || []) }).finally(pronto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefill por CÓDIGO de comanda: o número físico ("22") só aparece quando a
  // lista de abertas chega — daí em diante quem manda é a validação.
  useEffect(() => {
    if (prefill?.comanda_codigo == null || comanda) return
    const c = comandasAbertas.find((x) => x.codigo === prefill.comanda_codigo)
    if (c) setComanda(c.numero)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comandasAbertas])

  function aplicarIdent(d: IdentResposta) {
    setIdent(d)
    const trava = d.cliente_travado
    if (trava) {
      if (!travado.current) digitado.current = { ...clienteRef.current }
      travado.current = true
      setNome(trava.nome || '')
      setFone(soDigitos(trava.fone || ''))
      setCpf(soDigitos(trava.cpf || ''))
    } else if (travado.current) {
      travado.current = false
      setNome(digitado.current?.nome || '')
      setFone(digitado.current?.fone || '')
      setCpf(digitado.current?.cpf || '')
      digitado.current = null
    }
    // Comanda aberta manda na mesa (a mesa dela, não a que estava no campo).
    if (d.mesa_travada != null && String(d.mesa_travada) !== mesaRef.current) setMesa(String(d.mesa_travada))
  }

  // Valida a cada mudança (300ms). Campos vazios = avulso: nada a perguntar.
  useEffect(() => {
    const m = mesa.trim()
    const c = comanda.trim()
    setErroExterno(null)
    if (!m && !c) {
      setValidando(false)
      if (ident) aplicarIdent({ mesa: null, comanda: null, cliente_travado: null, mesa_travada: null, comanda_travada: false, erro: null })
      return
    }
    let vivo = true
    setValidando(true)
    const t = setTimeout(async () => {
      const qs = new URLSearchParams()
      if (m) qs.set('mesa', m)
      if (c) qs.set('comanda', c)
      const d = await api.get(`/identificacao?${qs.toString()}`)
      if (!vivo) return
      if (d?.success) aplicarIdent(d as IdentResposta)
      setValidando(false)
    }, 300)
    return () => { vivo = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesa, comanda])

  // ── Estado derivado ──────────────────────────────────────────────────────
  const trava = ident?.cliente_travado || null
  const mesaTravada = ident?.mesa_travada != null
  const comandaTravada = !!ident?.comanda_travada
  const erro = ident?.erro || (erroExterno ? { codigo: 'servidor', ...erroExterno } : null)
  const rotuloTrava = trava
    ? trava.origem === 'comanda'
      ? `Cliente da comanda ${ident?.comanda?.numero ?? ''}`.trim()
      : `Cliente da mesa ${ident?.mesa?.numero ?? ''}`.trim()
    : ''
  const campo = 'min-h-[48px] w-full rounded-xl border px-3 text-base outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15'
  const campoTravado = 'cursor-not-allowed border-slate-200 bg-slate-100 pr-10 text-slate-500'

  const textoOnde = ident?.comanda
    ? `Comanda ${ident.comanda.numero}${ident.comanda.mesa_numero != null ? ` · mesa ${ident.comanda.mesa_numero}` : ' · sem mesa'}.`
    : ident?.mesa
      ? `Mesa ${ident.mesa.numero} selecionada.`
      : 'Escolha na lista ou digite o número.'

  /** Uma linha por mesa aberta, em ordem numérica. */
  const linhasMesa = useMemo<LinhaMesa[]>(() => {
    return mesasAbertas
      .map((m) => {
        const cs = (m.comandas || [])
          .map((c) => ({ codigo: Number(c.codigo), numero: String(c.numero ?? ''), cliente_nome: c.cliente_nome ?? null }))
          .filter((c) => c.numero)
        // Se esta é a mesa selecionada, a próxima comanda vem do servidor.
        const doServidor = ident?.mesa?.numero === Number(m.numero) ? ident?.mesa?.proxima_comanda ?? null : null
        return {
          codigo: m.codigo,
          numero: Number(m.numero),
          nome: m.nome ?? null,
          comandas: cs,
          proxima: doServidor ?? proximaDaMesa(cs),
        }
      })
      .sort((a, b) => a.numero - b.numero)
  }, [mesasAbertas, ident])

  const comandasSemMesa = useMemo(
    () => comandasAbertas.filter((c) => c.mesa_numero == null),
    [comandasAbertas]
  )

  const rotulo = useMemo(() => {
    const partes: string[] = []
    if (mesa.trim()) partes.push(`Mesa ${mesa.trim()}`)
    if (comanda.trim()) partes.push(`Comanda ${comanda.trim()}`)
    return partes.length ? partes.join(' · ') : 'Avulso'
  }, [mesa, comanda])

  useEffect(() => {
    onChange({
      cliente: {
        nome: nome.trim() || undefined,
        telefone: fone ? soDigitos(fone) : undefined,
        cpf: cpf ? soDigitos(cpf) : undefined,
      },
      mesa_numero: mesa.trim() ? Number(soDigitos(mesa)) : undefined,
      // Comanda que já existe vai por CÓDIGO; comanda nova, pelo número digitado.
      comanda_codigo: ident?.comanda?.codigo ?? undefined,
      comanda_numero: ident?.comanda ? undefined : (comanda.trim() || undefined),
      bloqueado: !!erro,
      validando,
      rotulo,
      nome: nome.trim(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, fone, cpf, mesa, comanda, ident, erro, validando, rotulo])

  // ── Seleção pela lista (tudo passa pela mesma validação) ─────────────────
  function escolherMesa(numero: number) {
    setMesa(String(numero))
    setComanda('')
  }
  function escolherComanda(numeroMesa: number | null, numeroComanda: string) {
    setMesa(numeroMesa != null ? String(numeroMesa) : '')
    setComanda(numeroComanda)
  }
  function paraLevar() {
    setMesa('')
    setComanda('')
  }

  const semNada = !mesa.trim() && !comanda.trim()
  const chipBase = 'inline-flex min-h-[44px] items-center gap-1 rounded-full border px-3 text-xs font-semibold transition'

  function chipComanda(chave: string, numeroMesa: number | null, c: { numero: string; cliente_nome: string | null }) {
    const on = comanda.trim() === c.numero && (numeroMesa == null ? !mesa.trim() : mesa === String(numeroMesa))
    return (
      <button
        key={chave}
        onClick={() => escolherComanda(numeroMesa, c.numero)}
        className={`${chipBase} ${on ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-700'}`}
        style={on ? { backgroundColor: cor, borderColor: cor } : undefined}
      >
        Comanda {c.numero}{c.cliente_nome ? ` · ${c.cliente_nome}` : ''}
      </button>
    )
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Quem é o cliente? <span className="font-normal text-slate-400">(opcional)</span>
          </h2>
          {trava && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-800">
              <Lock size={14} /> {rotuloTrava}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <div className="relative">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={!!trava}
                placeholder="Nome (opcional)"
                className={`${campo} ${trava ? campoTravado : 'border-slate-300'}`}
              />
              {trava && <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            </div>
            <p className="mt-1 px-1 text-xs text-slate-400">
              {trava
                ? `Vem ${trava.origem === 'comanda' ? 'da comanda' : 'da mesa'}. Pra corrigir, fale com o caixa.`
                : 'Sem nome, o pedido é chamado pela senha, mesa ou comanda.'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <input
                value={mascararFone(fone)}
                onChange={(e) => setFone(soDigitos(e.target.value))}
                disabled={!!trava}
                inputMode="numeric"
                placeholder="Telefone (opcional)"
                className={`${campo} ${trava ? campoTravado : 'border-slate-300'}`}
              />
              {trava && <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            </div>
            <div className="relative">
              <input
                value={mascararCpf(cpf)}
                onChange={(e) => setCpf(soDigitos(e.target.value))}
                disabled={!!trava}
                inputMode="numeric"
                placeholder="CPF na nota (opcional)"
                className={`${campo} ${trava ? campoTravado : 'border-slate-300'}`}
              />
              {trava && <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Onde vai consumir?</h2>
            <p className="mt-0.5 text-xs text-slate-400">{textoOnde}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {validando && <Loader2 size={16} className="animate-spin text-slate-300" />}
            {!semNada && (
              <button onClick={paraLevar} className="min-h-[44px] px-1 text-xs font-semibold text-slate-500 underline">
                Limpar
              </button>
            )}
          </div>
        </div>

        {erro && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <p className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{erro.mensagem}</span>
            </p>
            {erro.sugestao && (
              <button
                onClick={() => setComanda(String(erro.sugestao))}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-sm font-bold text-white active:scale-[0.99]"
              >
                <Plus size={16} /> Abrir comanda {erro.sugestao}
              </button>
            )}
          </div>
        )}

        {/* Digitar direto continua sendo o caminho mais rápido pra quem sabe o número. */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <Armchair size={14} /> Mesa
            </label>
            <div className="relative">
              <input
                value={mesa}
                onChange={(e) => setMesa(soDigitos(e.target.value).slice(0, 5))}
                disabled={mesaTravada}
                inputMode="numeric"
                placeholder="Nº da mesa"
                className={`${campo} ${mesaTravada ? campoTravado : 'border-slate-300'}`}
              />
              {mesaTravada && <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            </div>
            {mesaTravada && <p className="mt-1 px-1 text-xs text-slate-400">A comanda {ident?.comanda?.numero} já está nesta mesa.</p>}
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <ClipboardList size={14} /> Comanda
            </label>
            <div className="relative">
              <input
                value={comanda}
                onChange={(e) => setComanda(e.target.value.slice(0, 20))}
                disabled={comandaTravada}
                placeholder={comandaTravada ? 'Sem comanda' : 'Nº da comanda'}
                className={`${campo} ${comandaTravada ? campoTravado : 'border-slate-300'}`}
              />
              {comandaTravada && <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            </div>
            {comandaTravada && <p className="mt-1 px-1 text-xs text-slate-400">Esta mesa trabalha sem comanda.</p>}
          </div>
        </div>

        {/* Abertas agora — uma linha por mesa, comandas à direita. */}
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Abertas agora</p>
            {carregandoLista && <Loader2 size={14} className="animate-spin text-slate-300" />}
          </div>

          <div className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
            {!carregandoLista && linhasMesa.length === 0 && comandasSemMesa.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-400">
                Nenhuma mesa ou comanda aberta — digite o número acima para abrir.
              </p>
            )}

            {linhasMesa.map((m) => {
              const mesaSelecionada = mesa === String(m.numero) && !comanda.trim()
              return (
                <div key={m.codigo} className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
                  <button
                    onClick={() => escolherMesa(m.numero)}
                    className={`min-h-[44px] shrink-0 rounded-lg border px-2.5 text-left transition ${
                      mesaSelecionada ? 'border-transparent text-white' : 'border-transparent bg-white hover:bg-slate-50'
                    }`}
                    style={mesaSelecionada ? { backgroundColor: cor, borderColor: cor } : undefined}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`text-base font-extrabold tracking-tight ${mesaSelecionada ? 'text-white' : 'text-slate-900'}`}>
                        MESA {m.numero}
                      </span>
                      {m.comandas.length > 0 && (
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${mesaSelecionada ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {m.comandas.length} {m.comandas.length === 1 ? 'comanda' : 'comandas'}
                        </span>
                      )}
                    </span>
                    {m.nome && (
                      <span className={`block text-xs ${mesaSelecionada ? 'text-white/80' : 'text-slate-500'}`}>{m.nome}</span>
                    )}
                  </button>

                  {(m.comandas.length > 0 || m.proxima) && (
                    <div className="flex flex-wrap gap-1.5 sm:ml-auto sm:justify-end">
                      {m.comandas.map((c) => chipComanda(`m${m.codigo}c${c.codigo}`, m.numero, c))}
                      {m.proxima && (() => {
                        const on = mesa === String(m.numero) && comanda.trim() === m.proxima
                        return (
                          <button
                            onClick={() => escolherComanda(m.numero, m.proxima!)}
                            className={`${chipBase} ${on ? 'border-transparent text-white' : 'border-dashed border-primary-300 bg-white text-primary-700'}`}
                            style={on ? { backgroundColor: cor, borderColor: cor } : undefined}
                          >
                            <Plus size={14} /> Nova comanda {m.proxima}
                          </button>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}

            {comandasSemMesa.length > 0 && (
              <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
                <div className="flex min-h-[44px] shrink-0 items-center px-2.5">
                  <span className="text-sm font-bold text-slate-500">Sem mesa</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:ml-auto sm:justify-end">
                  {comandasSemMesa.map((c) => chipComanda(`s${c.codigo}`, null, { numero: c.numero, cliente_nome: c.cliente_nome }))}
                </div>
              </div>
            )}

            <button
              onClick={paraLevar}
              className={`min-h-[48px] w-full px-3 text-left text-sm font-semibold transition ${
                semNada ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={semNada ? { backgroundColor: cor } : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag size={16} className={semNada ? 'text-white/80' : 'text-slate-400'} />
                Pra levar (sem mesa e sem comanda)
              </span>
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
