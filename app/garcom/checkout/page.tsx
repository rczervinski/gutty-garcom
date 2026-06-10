'use client'

import AppHeader from '@/components/AppHeader'
import OrderComposer from '@/components/OrderComposer'

export default function CheckoutPage() {
  return (
    <main className="min-h-screen pb-40">
      <AppHeader title="Conferir pedido" back />
      <div className="mx-auto w-full max-w-2xl">
        <OrderComposer variant="page" />
      </div>
    </main>
  )
}
