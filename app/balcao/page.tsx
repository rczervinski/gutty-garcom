'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Armchair, ListOrdered, Repeat, LogOut, UserRound, Store } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/client-api'

/**
 * Menu do MODO DELIVERY COM BALCÃO — mesmo desenho e vocabulário do menu
 * tradicional (`/garcom`), pra quem troca de modo não precisar reaprender nada.
 */
export default function MenuBalcaoPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')

  useEffect(() => {
    // /balcao não passa pela trava de vendedor do middleware (que cobre /garcom),
    // então a checagem é aqui.
    apiGet('/api/garcom/vendedor/me')
      .then((j) => setNome(j.vendedor?.nome || ''))
      .catch(() => router.replace('/garcom/login'))
    apiGet('/api/auth/me')
      .then((j) => setEmpresa(j.empresa?.nome || ''))
      .catch(() => {})
  }, [router])

  async function sair() {
    try {
      await apiPost('/api/garcom/vendedor/logout')
    } finally {
      router.replace('/garcom/login')
    }
  }

  const cards = [
    { onClick: () => router.push('/balcao/pedir'), label: 'Anotar pedido', desc: 'Cardápio com fotos e complementos', icon: ClipboardList, color: 'bg-primary-600' },
    { onClick: () => router.push('/balcao/mesas'), label: 'Mesas e comandas', desc: 'O que está aberto no salão', icon: Armchair, color: 'bg-emerald-600' },
    { onClick: () => router.push('/balcao/pedidos'), label: 'Meus pedidos', desc: 'Acompanhar o que está na cozinha', icon: ListOrdered, color: 'bg-amber-600' },
    { onClick: () => router.push('/garcom/modo'), label: 'Trocar modo', desc: 'Voltar pro modo tradicional', icon: Repeat, color: 'bg-stone-900' },
  ]

  return (
    <main className="min-h-screen">
      <header className="bg-stone-900 text-white">
        <div className="mx-auto w-full max-w-5xl px-5 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="flex items-baseline gap-2">
                <span className="gutty-shine-dark font-display text-3xl font-extrabold leading-none tracking-tighter">GUTTY</span>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-300">Pedidos</span>
              </h1>
              {empresa && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-300">
                  <Store size={14} className="text-primary-400" />
                  <span className="font-medium">{empresa}</span>
                </p>
              )}
            </div>
            <button onClick={sair} className="grid h-11 w-11 place-items-center rounded-full text-stone-400 hover:bg-white/10" aria-label="Sair">
              <LogOut size={20} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-300">
            <UserRound size={16} className="text-primary-400" />
            <span className="font-medium text-white">{nome || '...'}</span>
            <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-300">
              Delivery com balcão
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.label}
              onClick={c.onClick}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:border-primary-200 hover:shadow-card-hover active:scale-[0.99] sm:flex-col sm:items-start sm:gap-5 sm:p-6"
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white sm:h-14 sm:w-14 ${c.color}`}>
                <Icon size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900">{c.label}</p>
                <p className="text-sm text-slate-500">{c.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}
