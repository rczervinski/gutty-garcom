'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserRound, Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/client-api'

export default function LoginVendedorPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo || !senha) return
    setLoading(true)
    try {
      const json = await apiPost('/api/garcom/vendedor/login', { codigo, senha })
      toast.success(`Olá, ${json.vendedor.nome}`)
      router.replace('/garcom')
    } catch (err: any) {
      toast.error(err?.message || 'Código ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-white shadow-elevated">
          <UserRound size={30} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Login do garçom</h1>
        <p className="mt-1 text-sm text-slate-500">Informe seu código e senha</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Código</label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            autoFocus
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Ex.: 12"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-base font-semibold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
