'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserRound, Loader2 } from 'lucide-react'
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
    <main className="flex min-h-screen flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-white shadow-elevated">
          <UserRound size={30} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Login do garçom</h1>
        <p className="mt-1 text-sm text-slate-500">Entre com seu código ou nome</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Switch Código / Nome */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(['codigo', 'nome'] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setModo(m)
                setVendedor('')
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                modo === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {m === 'codigo' ? 'Código' : 'Nome'}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{modo === 'codigo' ? 'Código' : 'Nome'}</label>
          <input
            value={vendedor}
            onChange={(e) => onVendedor(e.target.value)}
            inputMode={modo === 'codigo' ? 'numeric' : 'text'}
            autoCapitalize={modo === 'codigo' ? 'none' : 'characters'}
            autoFocus
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder={modo === 'codigo' ? 'Ex.: 12' : 'Nome do vendedor'}
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
