'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Minus, Trash2, Loader2, Hash, Send } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { apiGet, apiPost, brl } from '@/lib/client-api'
import { getCart, setQuantity, removeItem, clearCart, cartTotal, CART_EVENT, CartItem } from '@/lib/cart'

type ComandaAberta = { comanda: number; nome: string; descricao: string }

export default function CheckoutPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [comanda, setComanda] = useState('')
  const [nome, setNome] = useState('')
  const [obs, setObs] = useState('')
  const [abertas, setAbertas] = useState<ComandaAberta[]>([])
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
  }, [])

  // Autocomplete: digitar a comanda preenche o nome (se existir aberta).
  function onComanda(v: string) {
    const num = v.replace(/\D/g, '')
    setComanda(num)
    const found = abertas.find((a) => String(a.comanda) === num)
    if (found && found.nome) setNome(found.nome)
  }

  function escolher(a: ComandaAberta) {
    setComanda(String(a.comanda))
    setNome(a.nome || '')
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

  async function enviar() {
    if (items.length === 0) return toast.error('Carrinho vazio')
    if (!comanda && !nome.trim()) return toast.error('Informe a comanda ou o nome')

    setEnviando(true)
    try {
      let numComanda = parseInt(comanda)
      if (!numComanda) {
        const j = await apiGet('/api/garcom/proxima-comanda')
        numComanda = j.data
      }
      await apiPost('/api/garcom/comandas', {
        comanda: numComanda,
        mesa: numComanda,
        nome: nome.trim(),
        obs: obs.trim(),
        items: items.map((i) => ({ codigo_gtin: i.codigoGtin, valor: i.precoVenda, qtde: i.quantidade })),
      })
      clearCart()
      toast.success(`Pedido enviado para a comanda ${numComanda}`)
      router.replace('/garcom')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen pb-40">
      <AppHeader title="Conferir pedido" back />

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-slate-400">Carrinho vazio</p>
      ) : (
        <ul className="space-y-2 p-3">
          {items.map((i) => (
            <li key={i.codigoGtin} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
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
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Comanda / Mesa</label>
            <input
              value={comanda}
              onChange={(e) => onComanda(e.target.value)}
              inputMode="numeric"
              placeholder="Número"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button onClick={novaComanda} className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-3 text-sm font-medium text-white active:scale-95">
            <Hash size={16} /> Nova
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cliente (opcional)</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do cliente"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Observação</label>
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: sem cebola"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {abertas.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Comandas abertas</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {abertas.map((a) => (
                <button
                  key={`${a.comanda}-${a.nome}`}
                  onClick={() => escolher(a)}
                  className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 active:scale-95"
                >
                  {a.descricao}
                </button>
              ))}
            </div>
          </div>
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
            Enviar pedido
          </span>
          <span className="font-bold">{brl(total)}</span>
        </button>
      </div>
    </main>
  )
}
