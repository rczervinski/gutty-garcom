'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'

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
    <main className="flex min-h-screen flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary-600 text-white shadow-elevated">
          <Building2 size={30} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gutty Garçom</h1>
        <p className="mt-1 text-sm text-slate-500">Acesse a empresa para começar</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Empresa</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            autoCapitalize="none"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Nome da empresa"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-base font-semibold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
