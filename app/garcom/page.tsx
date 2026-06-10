'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, ListOrdered, GitMerge, LogOut, UserRound, Store } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/client-api'
import { clearTargetComanda } from '@/lib/target-comanda'
import { clearCart } from '@/lib/cart'

export default function MenuPage() {
  const router = useRouter()
  const [nome, setNome] = useState<string>('')
  const [empresa, setEmpresa] = useState<string>('')

  useEffect(() => {
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

  // "Anotar pedido" SEMPRE começa do zero: solta a comanda-alvo e limpa o
  // carrinho livre. (Os carrinhos por comanda ficam guardados nas suas chaves.)
  function anotarPedido() {
    clearTargetComanda()
    clearCart()
    router.push('/garcom/categorias')
  }

  const cards = [
    { onClick: anotarPedido, label: 'Anotar pedido', desc: 'Cardápio e novo pedido', icon: ClipboardList, color: 'bg-primary-600' },
    { onClick: () => router.push('/garcom/comandas'), label: 'Comandas abertas', desc: 'Ver, editar e lançar em comandas', icon: ListOrdered, color: 'bg-emerald-600' },
    { onClick: () => router.push('/garcom/unir'), label: 'Unir comandas', desc: 'Juntar / desfazer', icon: GitMerge, color: 'bg-amber-600' },
  ]

  return (
    <main className="min-h-screen">
      <header className="bg-stone-900 text-white">
        <div className="mx-auto w-full max-w-5xl px-5 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <div>
              {/* Logo na MESMA linha: GUTTY + PEDIDOS */}
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
          <div className="mt-3 flex items-center gap-2 text-sm text-stone-300">
            <UserRound size={16} className="text-primary-400" />
            <span className="font-medium text-white">{nome || '...'}</span>
          </div>
        </div>
      </header>

      {/* Celular: lista empilhada. Tablet/totem/PC: três cartões lado a lado. */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
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
