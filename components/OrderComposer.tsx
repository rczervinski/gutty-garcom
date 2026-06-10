'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  Send,
  ListOrdered,
  PlusCircle,
  CheckCircle2,
  MessageSquarePlus,
  Lock,
  ShoppingCart,
} from 'lucide-react'
import ComandaPicker, { ComandaAberta } from '@/components/ComandaPicker'
import { apiGet, apiPost, brl } from '@/lib/client-api'
import { getCart, setQuantity, removeItem, clearCart, setObs, cartTotal, CART_EVENT, CartItem } from '@/lib/cart'
import { getTargetComanda, clearTargetComanda, TARGET_EVENT } from '@/lib/target-comanda'

/**
 * Composição do pedido: itens do carrinho + comanda/cliente + envio.
 * O MESMO fluxo em todo dispositivo, mudando só o layout:
 * - variant="page"  → página de checkout (celular/tablet), barra de envio fixa.
 * - variant="panel" → painel lateral sempre visível (totem/PC, lg+).
 */
export default function OrderComposer({ variant }: { variant: 'page' | 'panel' }) {
  const router = useRouter()
  const isPanel = variant === 'panel'

  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [comanda, setComanda] = useState('')
  const [nome, setNome] = useState('')
  const [abertas, setAbertas] = useState<ComandaAberta[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Travado = lançamento direto numa comanda aberta (+ em Comandas).
  const [locked, setLocked] = useState(false)
  const [targetNum, setTargetNum] = useState<number | null>(null)

  const syncTarget = useCallback(() => {
    const t = getTargetComanda()
    if (t) {
      setComanda(String(t.comanda))
      setNome(t.nome || '')
      setTargetNum(t.comanda)
      setLocked(true)
    } else {
      setTargetNum(null)
      setLocked(false)
    }
  }, [])

  useEffect(() => {
    const syncCart = () => {
      setItems(getCart())
      setTotal(cartTotal())
    }
    syncCart()
    syncTarget()
    const onTarget = () => {
      syncCart()
      syncTarget()
    }
    window.addEventListener(CART_EVENT, syncCart)
    window.addEventListener(TARGET_EVENT, onTarget)
    return () => {
      window.removeEventListener(CART_EVENT, syncCart)
      window.removeEventListener(TARGET_EVENT, onTarget)
    }
  }, [syncTarget])

  const loadAbertas = useCallback(() => {
    apiGet('/api/garcom/comandas')
      .then((j) => setAbertas(j.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadAbertas()
  }, [loadAbertas])

  // ---- Autocomplete bidirecional (espelha o CheckoutActivity do Cielo) ----
  function onComanda(v: string) {
    const num = v.replace(/\D/g, '')
    setComanda(num)
    const found = abertas.find((a) => String(a.comanda) === num)
    if (found) setNome(found.nome || '')
  }

  function onNome(v: string) {
    setNome(v)
    const found = abertas.find((a) => (a.nome || '').toLowerCase() === v.trim().toLowerCase())
    if (found) setComanda(String(found.comanda))
  }

  function escolher(a: ComandaAberta) {
    setComanda(String(a.comanda))
    setNome(a.nome || '')
    setPickerOpen(false)
  }

  async function novaComanda() {
    try {
      const j = await apiGet('/api/garcom/proxima-comanda')
      setComanda(String(j.data))
      setNome('')
      toast.success(`Nova comanda ${j.data}`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro')
    }
  }

  function limparCarrinho() {
    if (items.length === 0) return
    clearCart()
    toast.success('Carrinho limpo')
  }

  const numComanda = parseInt(comanda) || 0
  const existente = useMemo(() => abertas.find((a) => a.comanda === numComanda) || null, [abertas, numComanda])

  async function enviar() {
    if (items.length === 0) return toast.error('Carrinho vazio')
    if (!comanda && !nome.trim()) return toast.error('Informe a comanda ou o nome do cliente')

    setEnviando(true)
    try {
      // Servidor resolve a comanda: usa a informada, senão REUSA a aberta do
      // nome, senão cria a próxima (alinhado à produção).
      const j = await apiPost('/api/garcom/comandas', {
        comanda: parseInt(comanda) || 0,
        nome: nome.trim(),
        items: items.map((i) => ({ codigo_gtin: i.codigoGtin, valor: i.precoVenda, qtde: i.quantidade, obs: i.obs || '' })),
      })
      const num = j?.data?.comanda
      // Limpa o carrinho ANTES de soltar a comanda-alvo (a chave depende dela).
      clearCart()
      clearTargetComanda()
      toast.success(existente ? `Itens adicionados à comanda ${num}` : `Pedido enviado para a comanda ${num}`)
      if (isPanel) {
        // No painel o garçom segue no cardápio: só zera e recarrega as abertas.
        setComanda('')
        setNome('')
        loadAbertas()
      } else {
        router.replace('/garcom')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100 disabled:text-slate-500'

  const sendButton = (
    <button
      onClick={enviar}
      disabled={enviando || items.length === 0}
      className="flex w-full items-center justify-between rounded-2xl bg-primary-600 px-5 py-4 font-semibold text-white shadow-elevated transition active:scale-[0.99] disabled:opacity-60"
    >
      <span className="flex items-center gap-2">
        {enviando ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        {existente ? 'Adicionar à comanda' : 'Enviar pedido'}
      </span>
      <span className="font-bold">{brl(total)}</span>
    </button>
  )

  return (
    <div className={isPanel ? 'flex h-full flex-col' : ''}>
      {/* Cabeçalho do painel (só no modo lateral) */}
      {isPanel && (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShoppingCart size={16} className="text-primary-600" />
            Pedido atual
          </h2>
          {items.length > 0 && (
            <button onClick={limparCarrinho} className="grid h-9 w-9 place-items-center rounded-full text-rose-500 hover:bg-rose-50" aria-label="Limpar carrinho">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      {/* Aviso de comanda travada */}
      {locked && targetNum !== null && (
        <div className="flex items-start gap-2 border-b border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <Lock size={16} className="mt-0.5 shrink-0 text-primary-700" />
          <span>
            Você está inserindo na comanda <b>{targetNum}</b>
            {nome ? <> · <b>{nome}</b></> : null}.{' '}
            Se deseja alterar,{' '}
            <button onClick={() => setLocked(false)} className="font-bold underline underline-offset-2">
              clique aqui
            </button>
            .
          </span>
        </div>
      )}

      <div className={isPanel ? 'min-h-0 flex-1 overflow-y-auto' : ''}>
        {items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <ShoppingCart size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">
              {isPanel ? 'Toque nos produtos ao lado para montar o pedido' : 'Carrinho vazio'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 p-3">
            {items.map((i) => (
              <li key={i.codigoGtin} className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{i.descricao}</p>
                    <p className="text-sm text-slate-500">
                      {brl(i.precoVenda)} · <span className="font-semibold text-primary-700">{brl(i.precoVenda * i.quantidade)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQuantity(i.codigoGtin, i.quantidade - 1)}
                      className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700 active:scale-95"
                      aria-label={`Diminuir ${i.descricao}`}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{i.quantidade}</span>
                    <button
                      onClick={() => setQuantity(i.codigoGtin, i.quantidade + 1)}
                      className="grid h-10 w-10 place-items-center rounded-lg bg-primary-600 text-white active:scale-95"
                      aria-label={`Aumentar ${i.descricao}`}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => removeItem(i.codigoGtin)}
                      className="grid h-10 w-10 place-items-center rounded-lg text-rose-500 active:scale-95"
                      aria-label={`Remover ${i.descricao}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {/* Observação POR ITEM */}
                <div className="mt-2 flex items-center gap-2">
                  <MessageSquarePlus size={16} className="shrink-0 text-slate-400" />
                  <input
                    value={i.obs || ''}
                    onChange={(e) => setObs(i.codigoGtin, e.target.value)}
                    placeholder="Obs do item (ex.: sem cebola, ao ponto)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:bg-white"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 p-4">
          {!locked && (
            <div className="flex gap-2">
              <button
                onClick={() => setPickerOpen(true)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 active:scale-95"
              >
                <ListOrdered size={18} /> Comanda aberta {abertas.length > 0 ? `(${abertas.length})` : ''}
              </button>
              <button
                onClick={novaComanda}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-medium text-white active:scale-95"
              >
                <PlusCircle size={18} /> Nova comanda
              </button>
            </div>
          )}

          <div>
            <label htmlFor={`oc-comanda-${variant}`} className="mb-1 block text-sm font-medium text-slate-700">Comanda / Mesa</label>
            <input
              id={`oc-comanda-${variant}`}
              value={comanda}
              onChange={(e) => onComanda(e.target.value)}
              disabled={locked}
              inputMode="numeric"
              list={`comandas-abertas-${variant}`}
              placeholder="Número (ou deixe vazio e informe só o nome)"
              className={inputCls}
            />
            <datalist id={`comandas-abertas-${variant}`}>
              {abertas.map((a) => (
                <option key={a.comanda} value={a.comanda}>
                  {a.nome || `Comanda ${a.comanda}`}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor={`oc-nome-${variant}`} className="mb-1 block text-sm font-medium text-slate-700">Cliente</label>
            <input
              id={`oc-nome-${variant}`}
              value={nome}
              onChange={(e) => onNome(e.target.value)}
              disabled={locked}
              list={`clientes-abertos-${variant}`}
              placeholder="Nome do cliente"
              className={inputCls}
            />
            <datalist id={`clientes-abertos-${variant}`}>
              {abertas.filter((a) => a.nome).map((a) => (
                <option key={`${a.comanda}-${a.nome}`} value={a.nome}>
                  Comanda {a.comanda}
                </option>
              ))}
            </datalist>
          </div>

          {/* Badge: existente / nova por número / nova só pelo nome */}
          {existente ? (
            <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>
                Adicionando à comanda <b>{numComanda}</b>
                {existente.nome ? <> · {existente.nome}</> : null} · já tem {existente.totalItens} {existente.totalItens === 1 ? 'item' : 'itens'}
              </span>
            </div>
          ) : numComanda > 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <PlusCircle size={18} className="shrink-0" />
              <span>Nova comanda <b>{numComanda}</b>{nome.trim() ? <> · {nome.trim().toUpperCase()}</> : null}</span>
            </div>
          ) : nome.trim() ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <PlusCircle size={18} className="shrink-0" />
              <span>Nova comanda para <b>{nome.trim().toUpperCase()}</b> · número automático ao enviar</span>
            </div>
          ) : (
            <p className="px-1 text-sm text-slate-500">Escolha uma comanda aberta, crie uma nova, ou informe só o nome do cliente.</p>
          )}

          {/* Envio inline no painel (a página usa barra fixa) */}
          {isPanel && <div className="pt-1">{sendButton}</div>}
        </div>
      </div>

      {!isPanel && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-4">
          <div className="mx-auto w-full max-w-2xl">{sendButton}</div>
        </div>
      )}

      <ComandaPicker open={pickerOpen} abertas={abertas} onPick={escolher} onClose={() => setPickerOpen(false)} />
    </div>
  )
}
