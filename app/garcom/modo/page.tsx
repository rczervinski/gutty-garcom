'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, UtensilsCrossed, ChevronRight, UserRound } from 'lucide-react'
import { apiGet } from '@/lib/client-api'
import { salvarModo } from '@/lib/modo'

/**
 * Escolha do modo de trabalho, logo depois do login do garçom.
 *
 * Dois botões e nada mais: o garçom decide sem ler. A escolha fica guardada no
 * aparelho, então esta tela só aparece na primeira entrada — e volta pelo item
 * "Trocar modo" dos dois menus.
 */
export default function ModoPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')

  useEffect(() => {
    apiGet('/api/garcom/vendedor/me')
      .then((j) => setNome(j.vendedor?.nome || ''))
      .catch(() => router.replace('/garcom/login'))
  }, [router])

  function escolher(modo: 'tradicional' | 'delivery') {
    salvarModo(modo)
    router.replace(modo === 'delivery' ? '/balcao' : '/garcom')
  }

  const opcoes = [
    {
      modo: 'tradicional' as const,
      titulo: 'Modo tradicional',
      desc: 'Comandas por número, cardápio por categoria. O de sempre.',
      icon: ClipboardList,
      cor: 'bg-stone-900',
    },
    {
      modo: 'delivery' as const,
      titulo: 'Modo delivery com balcão',
      desc: 'Cardápio com fotos e complementos, mesa e comanda do Gutty Delivery.',
      icon: UtensilsCrossed,
      cor: 'bg-primary-600',
    },
  ]

  return (
    <main className="flex min-h-screen flex-col bg-stone-50 px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tighter">
            <span className="gutty-shine">GUTTY</span>
          </h1>
          <p className="-mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary-700">Pedidos</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Como você vai trabalhar?</h2>
          {nome && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
              <UserRound size={16} className="text-primary-500" /> {nome}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {opcoes.map((o) => {
            const Icon = o.icon
            return (
              <button
                key={o.modo}
                onClick={() => escolher(o.modo)}
                className="flex min-h-[132px] flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:border-primary-200 hover:shadow-card-hover active:scale-[0.99]"
              >
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl text-white ${o.cor}`}>
                  <Icon size={26} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">{o.titulo}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{o.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                  Entrar <ChevronRight size={16} />
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          Dá pra trocar depois em “Trocar modo”, no menu.
        </p>
      </div>
    </main>
  )
}
