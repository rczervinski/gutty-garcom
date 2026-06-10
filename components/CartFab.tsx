'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { cartCount, cartTotal, CART_EVENT } from '@/lib/cart'
import { brl } from '@/lib/client-api'

export default function CartFab() {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const sync = () => {
      setCount(cartCount())
      setTotal(cartTotal())
    }
    sync()
    window.addEventListener(CART_EVENT, sync)
    return () => window.removeEventListener(CART_EVENT, sync)
  }, [])

  if (count === 0) return null

  // lg+: o painel lateral "Pedido atual" já está sempre visível — sem FAB.
  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md p-4 lg:hidden">
      <button
        onClick={() => router.push('/garcom/checkout')}
        className="pointer-events-auto flex w-full items-center justify-between rounded-2xl bg-primary-600 px-5 py-4 text-white shadow-elevated transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="relative">
            <ShoppingCart size={22} />
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs font-bold text-primary-700">
              {count}
            </span>
          </span>
          <span className="font-semibold">Ver carrinho</span>
        </span>
        <span className="font-bold">{brl(total)}</span>
      </button>
    </div>
  )
}
