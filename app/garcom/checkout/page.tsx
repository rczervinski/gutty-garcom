'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Minus, Trash2, Loader2, Send, ListOrdered, PlusCircle, CheckCircle2, MessageSquarePlus } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import ComandaPicker, { ComandaAberta } from '@/components/ComandaPicker'
import { apiGet, apiPost, brl } from '@/lib/client-api'
import { getCart, setQuantity, removeItem, clearCart, setObs, cartTotal, CART_EVENT, CartItem } from '@/lib/cart'
import { getTargetComanda, clearTargetComanda } from '@/lib/target-comanda'

export default function CheckoutPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [comanda, setComanda] = useState('')
  const [nome, setNome] = useState('')
  const [abertas, setAbertas] = useState<ComandaAberta[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const sync = () => {
      setItems(getCart())
      setTotal(cartTotal())
    }
    sync()
    window.addEventListener(CART_EVENT, sync)
    return () => window.removeEventListener(CART_EVENT, sync)
  }, [])

  useEffect(() => {
    apiGet('/api/garcom/comandas')
      .then((j) => setAbertas(j.data || []))
      .catch(() => {})
    const t = getTargetComanda()
    if (t) {
      setComanda(String(t.comanda))
      setNome(t.nome || '')
      clearTargetComanda()
    }
  }, [])

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

  // ---- Status: existente / nova por número / nova por nome (auto) ----
  const numComanda = parseInt(comanda) || 0
  const existente = useMemo(() => abertas.find((a) => a.comanda === numComanda) || null, [abertas, numComanda])

  async function enviar() {
    if (items.length === 0) return toast.error('Carrinho vazio')
    if (!comanda && !nome.trim()) return toast.error('Informe a comanda ou o nome do cliente')

    setEnviando(true)
    try {
      // Deixa o servidor resolver a comanda (alinhado à produção):
      // usa a informada, senão REUSA a comanda aberta do nome, senão cria a próxima.
      const j = await apiPost('/api/garcom/comandas', {
        comanda: parseInt(comanda) || 0,
        nome: nome.trim(),
        items: items.map((i) => ({ codigo_gtin: i.codigoGtin, valor: i.precoVenda, qtde: i.quantidade, obs: i.obs || '' })),
      })
      const num = j?.data?.comanda
      clearCart()
      toast.success(existente ? `Itens adicionados à comanda ${num}` : `Pedido enviado para a comanda ${num}`)
      router.replace('/garcom')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen pb-40">
      <AppHeader
        title="Conferir pedido"
        back
        right={
          items.length > 0 ? (
            <button onClick={limparCarrinho} className="grid h-9 w-9 place-items-center rounded-full text-rose-500 hover:bg-rose-50" aria-label="Limpar carrinho">
              <Trash2 size={18} />
            </button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-slate-400">Carrinho vazio</p>
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
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(i.codigoGtin, i.quantidade - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 active:scale-95">
                    <Minus size={16} />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{i.quantidade}</span>
                  <button onClick={() => setQuantity(i.codigoGtin, i.quantidade + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-white active:scale-95">
                    <Plus size={16} />
                  </button>
                  <button onClick={() => removeItem(i.codigoGtin)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 active:scale-95">
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
        <div className="flex gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 active:scale-95"
          >
            <ListOrdered size={18} /> Comanda aberta {abertas.length > 0 ? `(${abertas.length})` : ''}
          </button>
          <button
            onClick={novaComanda}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white active:scale-95"
          >
            <PlusCircle size={18} /> Nova comanda
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Comanda / Mesa</label>
          <input
            value={comanda}
            onChange={(e) => onComanda(e.target.value)}
            inputMode="numeric"
            list="comandas-abertas"
            placeholder="Número (ou deixe vazio e informe só o nome)"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <datalist id="comandas-abertas">
            {abertas.map((a) => (
              <option key={a.comanda} value={a.comanda}>
                {a.nome || `Comanda ${a.comanda}`}
              </option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cliente</label>
          <input
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            list="clientes-abertos"
            placeholder="Nome do cliente"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <datalist id="clientes-abertos">
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
            <CheckCircle2 size={18} />
            <span>
              Adicionando à comanda <b>{numComanda}</b>
              {existente.nome ? <> · {existente.nome}</> : null} · já tem {existente.totalItens} {existente.totalItens === 1 ? 'item' : 'itens'}
            </span>
          </div>
        ) : numComanda > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <PlusCircle size={18} />
            <span>Nova comanda <b>{numComanda}</b>{nome.trim() ? <> · {nome.trim().toUpperCase()}</> : null}</span>
          </div>
        ) : nome.trim() ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <PlusCircle size={18} />
            <span>Nova comanda para <b>{nome.trim().toUpperCase()}</b> · número automático ao enviar</span>
          </div>
        ) : (
          <p className="px-1 text-sm text-slate-400">Escolha uma comanda aberta, crie uma nova, ou informe só o nome do cliente.</p>
        )}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white p-4">
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
      </div>

      <ComandaPicker open={pickerOpen} abertas={abertas} onPick={escolher} onClose={() => setPickerOpen(false)} />
    </main>
  )
}
