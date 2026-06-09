'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginEmpresaPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome || !senha) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, senha }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        toast.error(json?.error === 'rate_limited' ? 'Muitas tentativas. Aguarde.' : 'Empresa ou senha inválida')
        return
      }
      router.replace('/garcom/login')
    } catch {
      toast.error('Falha de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-stone-50 px-6">
      {/* Acentos quentes de fundo (igual ao caixa) */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-100/50 blur-3xl" />

      <div className="relative">
        {/* Logo GUTTY PEDIDOS com shine */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-6xl font-extrabold tracking-tighter">
            <span className="gutty-shine">GUTTY</span>
          </h1>
          <p className="-mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-primary-700">Pedidos</p>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-stone-900">Bem-vindo</h2>
          <p className="mt-1 text-sm text-stone-500">Acesse a empresa para começar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-600">Empresa</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              autoCapitalize="none"
              autoComplete="username"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
              placeholder="Nome da empresa"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-600">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
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

        <div className="mt-10 border-t border-stone-100 pt-6 text-center">
          <p className="text-xs font-medium text-stone-400">Gutty Pedidos · © {new Date().getFullYear()} Gutty</p>
        </div>
      </div>
    </main>
  )
}
