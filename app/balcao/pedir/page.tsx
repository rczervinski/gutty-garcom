'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ShoppingBag, Check, AlertTriangle, ArrowLeft } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import Cardapio from '@/components/balcao/Cardapio'
import Carrinho from '@/components/balcao/Carrinho'
import Identificacao from '@/components/balcao/Identificacao'
import { useCarrinho } from '@/components/balcao/useCarrinho'
import { apiBalcao } from '@/components/balcao/api'
import { brl, COR_PADRAO } from '@/components/balcao/theme'
import {
  novaIdemKey, IDENT_VAZIA, MAX_OBS,
  type IdentificacaoValor, type PrefillPedido, type Produto,
} from '@/components/balcao/tipos'

type Passo = 'cardapio' | 'carrinho' | 'finalizar' | 'ok'

export default function PedirPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>}>
      <Pedir />
    </Suspense>
  )
}

/**
 * Anotar pedido no modo delivery: cardápio → pedido atual → comanda → cozinha.
 *
 * O layout muda com a tela, o fluxo não (DESIGN.md): no celular o pedido atual é
 * uma barra embaixo que abre a lista; no tablet/totem/PC ele fica num painel
 * lateral sempre visível. Aceita `?mesa=&comanda=` pra chegar já na conta certa.
 */
function Pedir() {
  const router = useRouter()
  const sp = useSearchParams()
  const carrinho = useCarrinho()

  const [cor, setCor] = useState(COR_PADRAO)
  const [passo, setPasso] = useState<Passo>('cardapio')
  const [produtoAtivo, setProdutoAtivo] = useState<Produto | null>(null)

  const [ident, setIdent] = useState<IdentificacaoValor>(IDENT_VAZIA)
  const [erroIdent, setErroIdent] = useState<{ mensagem: string; sugestao?: string | null } | null>(null)
  const [obs, setObs] = useState('')

  const [idemKey, setIdemKey] = useState(novaIdemKey)
  const [enviando, setEnviando] = useState(false)
  const [criado, setCriado] = useState<any>(null)
  const [rodada, setRodada] = useState(0)

  const prefill = useMemo<PrefillPedido>(() => ({
    mesa_numero: sp.get('mesa') ? Number(sp.get('mesa')) : null,
    comanda_numero: sp.get('comanda') || null,
  }), [sp])

  const aoMudarIdent = useCallback((v: IdentificacaoValor) => setIdent(v), [])

  function outroPedido() {
    carrinho.limpar()
    setObs(''); setCriado(null); setErroIdent(null)
    setIdent(IDENT_VAZIA)
    setIdemKey(novaIdemKey())
    setProdutoAtivo(null)
    setRodada((n) => n + 1)
    setPasso('cardapio')
  }

  async function enviar() {
    if (carrinho.itens.length === 0 || ident.bloqueado) return
    setEnviando(true)
    setErroIdent(null)
    const d = await apiBalcao.post('/pedidos', {
      cliente: ident.cliente,
      mesa_numero: ident.mesa_numero,
      comanda_codigo: ident.comanda_codigo,
      comanda_numero: ident.comanda_numero,
      observacao: obs.trim() || undefined,
      idempotency_key: idemKey,
      itens: carrinho.paraPedido(),
    })
    setEnviando(false)
    if (!d?.success) {
      // 409 de mesa × comanda (§10): a saída ("Abrir comanda 3") volta pro form.
      if (d?.codigo) setErroIdent({ mensagem: d.error || 'Identificação inválida', sugestao: d.sugestao ?? null })
      toast.error(d?.error || 'Não deu pra enviar o pedido')
      return
    }
    setCriado(d.pedido)
    setPasso('ok')
    toast.success(`Pedido ${d.pedido?.senha ?? ''} enviado`)
  }

  // ── Senha ────────────────────────────────────────────────────────────────
  if (passo === 'ok') {
    const lugar = criado?.mesa_numero != null || criado?.comanda_numero
      ? [criado?.mesa_numero != null ? `Mesa ${criado.mesa_numero}` : null, criado?.comanda_numero ? `Comanda ${criado.comanda_numero}` : null].filter(Boolean).join(' · ')
      : ident.nome || 'Avulso'
    return (
      <main className="min-h-screen">
        <AppHeader title="Pedido enviado" back="/balcao" />
        <div className="mx-auto w-full max-w-md p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="text-sm text-slate-500">Foi pra cozinha. Senha</p>
            <p className="my-1 text-6xl font-extrabold leading-none" style={{ color: cor }}>{criado?.senha}</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{lugar}</p>
            <p className="text-sm text-slate-500">{brl(criado?.total ?? carrinho.subtotal)}</p>

            <button
              onClick={outroPedido}
              className="mt-6 min-h-[52px] w-full rounded-xl text-sm font-bold text-white active:scale-[0.99]"
              style={{ backgroundColor: cor }}
            >
              Novo pedido
            </button>
            <button
              onClick={() => router.push('/balcao/pedidos')}
              className="mt-2 min-h-[52px] w-full rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 active:scale-[0.99]"
            >
              Ver meus pedidos
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Comanda / cliente ────────────────────────────────────────────────────
  if (passo === 'finalizar') {
    return (
      <main className="min-h-screen">
        <AppHeader title="Em qual comanda?" back />
        <div className="mx-auto w-full max-w-2xl space-y-3 p-3 sm:p-4">
          <button
            onClick={() => setPasso('cardapio')}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-slate-500"
          >
            <ArrowLeft size={16} /> Voltar ao cardápio
          </button>

          <Identificacao key={rodada} api={apiBalcao} prefill={prefill} onChange={aoMudarIdent} erroServidor={erroIdent} cor={cor} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <label className="text-sm font-semibold text-slate-900">Observação do pedido</label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value.slice(0, MAX_OBS))}
              maxLength={MAX_OBS}
              rows={2}
              placeholder="Ex.: servir tudo junto"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Resumo</h2>
            {carrinho.itens.map((i) => (
              <div key={i.id} className="flex justify-between gap-2 py-0.5 text-sm">
                <span className="min-w-0 text-slate-700">
                  <b>{i.qtde}x</b> {i.nome}
                  {i.modsResumo && <span className="block text-xs text-slate-400">{i.modsResumo}</span>}
                </span>
                <span className="shrink-0 text-slate-600">{brl(i.precoUnit * i.qtde)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
              <span>Total</span><span>{brl(carrinho.subtotal)}</span>
            </div>
          </section>

          {ident.bloqueado && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0" /> Resolva a comanda acima pra enviar.
            </p>
          )}

          <button
            onClick={enviar}
            disabled={enviando || carrinho.itens.length === 0 || ident.bloqueado || ident.validando}
            className="safe-bottom flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-50"
            style={{ backgroundColor: cor }}
          >
            {enviando && <Loader2 size={18} className="animate-spin" />}
            Enviar pedido · {brl(carrinho.subtotal)}
          </button>
        </div>
      </main>
    )
  }

  // ── Pedido atual em tela cheia (celular) ─────────────────────────────────
  if (passo === 'carrinho') {
    return (
      <main className="flex min-h-screen flex-col">
        <AppHeader title="Pedido atual" back />
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <Carrinho
            carrinho={carrinho}
            cor={cor}
            onFechar={() => setPasso('cardapio')}
            onFinalizar={() => setPasso('finalizar')}
            rotuloBotao="Continuar"
          />
        </div>
      </main>
    )
  }

  // ── Cardápio ─────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col">
      <AppHeader
        title={produtoAtivo ? produtoAtivo.nome : 'Anotar pedido'}
        back={produtoAtivo ? undefined : '/balcao'}
        right={
          produtoAtivo ? (
            <button
              onClick={() => setProdutoAtivo(null)}
              className="min-h-[44px] px-3 text-sm font-semibold text-slate-600"
            >
              Cardápio
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-stretch">
        <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          <Cardapio
            api={apiBalcao}
            cor={cor}
            onCor={setCor}
            produtoAtivo={produtoAtivo}
            onAbrirProduto={setProdutoAtivo}
            onAdicionar={(linha) => {
              carrinho.adicionar(linha)
              setProdutoAtivo(null)
              toast.success(`${linha.nome} adicionado`)
            }}
          />
        </div>

        {/* lg+: o pedido atual fica sempre visível ao lado (DESIGN.md). */}
        <aside
          className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[380px] shrink-0 border-l border-slate-200 bg-white lg:block"
          aria-label="Pedido atual"
        >
          <Carrinho carrinho={carrinho} cor={cor} onFinalizar={() => setPasso('finalizar')} rotuloBotao="Continuar" />
        </aside>
      </div>

      {/* Celular/tablet retrato: barra do pedido atual. */}
      {!produtoAtivo && carrinho.qtdeTotal > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 p-3 lg:hidden">
          <button
            onClick={() => setPasso('carrinho')}
            className="flex min-h-[56px] w-full items-center justify-between rounded-xl px-4 text-sm font-bold text-white shadow-elevated active:scale-[0.99]"
            style={{ backgroundColor: cor }}
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag size={18} /> {carrinho.qtdeTotal} {carrinho.qtdeTotal === 1 ? 'item' : 'itens'}
            </span>
            <span>Ver pedido · {brl(carrinho.subtotal)}</span>
          </button>
        </div>
      )}
    </main>
  )
}
