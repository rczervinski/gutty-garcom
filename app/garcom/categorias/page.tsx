'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronRight, Search } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import CartFab from '@/components/CartFab'
import TargetBanner from '@/components/TargetBanner'
import { apiGet } from '@/lib/client-api'

export default function CategoriasPage() {
  const router = useRouter()
  const [cats, setCats] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    apiGet('/api/garcom/categorias')
      .then((j) => setCats(j.data || []))
      .catch((e) => toast.error(e?.message || 'Erro ao carregar categorias'))
      .finally(() => setLoading(false))
  }, [])

  const vis = cats.filter((c) => c.toLowerCase().includes(filtro.toLowerCase()))

  return (
    <main className="min-h-screen pb-28">
      <AppHeader title="Categorias" back="/garcom" />
      <TargetBanner />

      <div className="p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar categoria"
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
          {vis.map((c) => (
            <li key={c}>
              <button
                onClick={() => router.push(`/garcom/categorias/${encodeURIComponent(c)}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-card transition active:scale-[0.99]"
              >
                <span className="font-medium text-slate-800">{c}</span>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            </li>
          ))}
          {vis.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nenhuma categoria</p>}
        </ul>
      )}

      <CartFab />
    </main>
  )
}
