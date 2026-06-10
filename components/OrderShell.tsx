'use client'

import OrderComposer from '@/components/OrderComposer'

/**
 * Casca do fluxo de cardápio: em telas grandes (lg+: tablet deitado, totem,
 * PC) o conteúdo divide espaço com o PEDIDO ATUAL num painel lateral sempre
 * visível. No celular o painel some e o CartFab leva ao checkout.
 */
export default function OrderShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl items-start">
      <div className="min-w-0 flex-1 pb-28 lg:pb-10">{children}</div>
      <aside
        className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[380px] shrink-0 border-l border-slate-200 bg-white lg:block"
        aria-label="Pedido atual"
      >
        <OrderComposer variant="panel" />
      </aside>
    </div>
  )
}
