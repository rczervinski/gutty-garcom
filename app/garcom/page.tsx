'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, ListOrdered, GitMerge, LogOut, UtensilsCrossed } from 'lucide-react'
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
      <header className="flex items-center gap-3 bg-slate-900 px-5 py-5 text-white">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
          <UtensilsCrossed size={22} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-300">Garçom</p>
          <p className="text-lg font-semibold leading-tight">{nome || '...'}</p>
        </div>
        <button onClick={sair} className="grid h-10 w-10 place-items-center rounded-full text-slate-300 hover:bg-white/10" aria-label="Sair">
          <LogOut size={20} />
        </button>
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
