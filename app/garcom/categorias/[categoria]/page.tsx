'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Minus, Search } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import CartFab from '@/components/CartFab'
import { apiGet, brl } from '@/lib/client-api'
import { addItem, setQuantity, getCart, CART_EVENT } from '@/lib/cart'

type Produto = {
  codigoInterno: number
  codigoGtin: string
  descricao: string
  descricaoDetalhada: string
  precoVenda: number
}

export default function ProdutosPage() {
  const params = useParams<{ categoria: string }>()
  const categoria = decodeURIComponent(params.categoria)

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})

  useEffect(() => {
    apiGet(`/api/garcom/produtos?categoria=${encodeURIComponent(categoria)}`)
      .then((j) => setProdutos(j.data || []))
      .catch((e) => toast.error(e?.message || 'Erro ao carregar produtos'))
      .finally(() => setLoading(false))
  }, [categoria])

  useEffect(() => {
    const sync = () => {
      const map: Record<string, number> = {}
      for (const i of getCart()) map[i.codigoGtin] = i.quantidade
      setQtyMap(map)
    }
    sync()
    window.addEventListener(CART_EVENT, sync)
    return () => window.removeEventListener(CART_EVENT, sync)
  }, [])

  const vis = useMemo(() => {
    const f = filtro.toLowerCase()
    return produtos.filter(
      (p) => (p.descricaoDetalhada || p.descricao || '').toLowerCase().includes(f) || p.codigoGtin.includes(f)
    )
  }, [produtos, filtro])

  function nome(p: Produto) {
    return p.descricaoDetalhada || p.descricao || p.codigoGtin
  }

  function add(p: Produto) {
    if (!p.codigoGtin) {
      toast.error('Produto sem código de barras')
      return
    }
    addItem({ codigoGtin: p.codigoGtin, descricao: nome(p), precoVenda: p.precoVenda }, 1)
  }

  return (
    <main className="min-h-screen pb-28">
      <AppHeader title={categoria} back="/garcom/categorias" />

      <div className="p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar produto"
            className="w-full bg-transparent py-2.5 text-base outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <ul className="space-y-2 px-3">
          {vis.map((p) => {
            const q = qtyMap[p.codigoGtin] || 0
            return (
              <li
                key={`${p.codigoInterno}-${p.codigoGtin}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{nome(p)}</p>
                  <p className="text-sm font-semibold text-primary-700">{brl(p.precoVenda)}</p>
                </div>
                {q > 0 ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(p.codigoGtin, q - 1)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 active:scale-95"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-6 text-center font-semibold">{q}</span>
                    <button
                      onClick={() => setQuantity(p.codigoGtin, q + 1)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-primary-600 text-white active:scale-95"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => add(p)}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-primary-600 text-white active:scale-95"
                    aria-label="Adicionar"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </li>
            )
          })}
          {vis.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nenhum produto</p>}
        </ul>
      )}

      <CartFab />
    </main>
  )
}
