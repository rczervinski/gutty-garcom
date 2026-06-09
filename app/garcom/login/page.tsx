'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/client-api'

type Modo = 'codigo' | 'nome'

export default function LoginVendedorPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('codigo')
  const [vendedor, setVendedor] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  function onVendedor(v: string) {
    // No modo "código" aceita só dígitos; no modo "nome" aceita texto livre.
    setVendedor(modo === 'codigo' ? v.replace(/\D/g, '') : v)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!vendedor || !senha) return
    setLoading(true)
    try {
      const json = await apiPost('/api/garcom/vendedor/login', { vendedor, senha })
      toast.success(`Olá, ${json.vendedor.nome}`)
      router.replace('/garcom')
    } catch (err: any) {
      toast.error(err?.message || 'Vendedor ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-stone-50 px-6">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-100/50 blur-3xl" />

      <div className="relative">
        {/* Logo GUTTY PEDIDOS com shine */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-extrabold tracking-tighter">
            <span className="gutty-shine">GUTTY</span>
          </h1>
          <p className="-mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary-700">Pedidos</p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-stone-900">Login do garçom</h2>
          <p className="mt-1 text-sm text-stone-500">Entre com seu código ou nome</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Switch Código / Nome */}
          <div className="flex rounded-xl bg-stone-200/70 p-1">
            {(['codigo', 'nome'] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModo(m)
                  setVendedor('')
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  modo === m ? 'bg-white text-primary-700 shadow-sm' : 'text-stone-500'
                }`}
              >
                {m === 'codigo' ? 'Código' : 'Nome'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-600">
              {modo === 'codigo' ? 'Código' : 'Nome'}
            </label>
            <input
              value={vendedor}
              onChange={(e) => onVendedor(e.target.value)}
              inputMode={modo === 'codigo' ? 'numeric' : 'text'}
              autoCapitalize={modo === 'codigo' ? 'none' : 'characters'}
              autoFocus
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              placeholder={modo === 'codigo' ? 'Ex.: 12' : 'Nome do vendedor'}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-600">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:shadow-primary-500/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
