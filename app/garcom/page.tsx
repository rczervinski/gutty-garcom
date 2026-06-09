'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, ListOrdered, GitMerge, LogOut, UserRound } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/client-api'

export default function MenuPage() {
  const router = useRouter()
  const [nome, setNome] = useState<string>('')

  useEffect(() => {
    apiGet('/api/garcom/vendedor/me')
      .then((j) => setNome(j.vendedor?.nome || ''))
      .catch(() => router.replace('/garcom/login'))
  }, [router])

  async function sair() {
    try {
      await apiPost('/api/garcom/vendedor/logout')
    } finally {
      router.replace('/garcom/login')
    }
  }

  const cards = [
    { href: '/garcom/categorias', label: 'Anotar pedido', desc: 'Cardápio e novo pedido', icon: ClipboardList, color: 'bg-primary-600' },
    { href: '/garcom/comandas', label: 'Comandas abertas', desc: 'Ver e editar comandas', icon: ListOrdered, color: 'bg-emerald-600' },
    { href: '/garcom/unir', label: 'Unir comandas', desc: 'Juntar / desfazer', icon: GitMerge, color: 'bg-amber-600' },
  ]

  return (
    <main className="min-h-screen">
      <header className="bg-stone-900 px-5 pb-5 pt-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-none tracking-tighter">
              <span className="gutty-shine-dark">GUTTY</span>
            </h1>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-primary-300">Pedidos</p>
          </div>
          <button onClick={sair} className="grid h-10 w-10 place-items-center rounded-full text-stone-400 hover:bg-white/10" aria-label="Sair">
            <LogOut size={20} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-stone-300">
          <UserRound size={16} className="text-primary-400" />
          <span className="font-medium text-white">{nome || '...'}</span>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.href}
              onClick={() => router.push(c.href)}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition active:scale-[0.99]"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-xl text-white ${c.color}`}>
                <Icon size={24} />
              </div>
              <div className="flex-1">
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
