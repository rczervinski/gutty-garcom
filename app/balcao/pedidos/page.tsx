'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, ListOrdered, RefreshCw } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { apiBalcao } from '@/components/balcao/api'
import { brl, COR_PADRAO } from '@/components/balcao/theme'
import { tempoRelativo } from '@/components/balcao/tipos'

type Pedido = {
  codigo: number; numero: string; senha: number; status: string
  cliente_nome: string | null; mesa_numero: number | null; comanda_numero: string | null
  total: number; criado_em: string; resumo?: string
}

const POLL_MS = 8000
const STATUS: Record<string, { label: string; cls: string; barra: string }> = {
  aguardando: { label: 'Aguardando', cls: 'bg-slate-100 text-slate-600', barra: 'bg-slate-300' },
  em_preparo: { label: 'Em preparo', cls: 'bg-amber-100 text-amber-700', barra: 'bg-amber-400' },
  pronto: { label: 'Pronto', cls: 'bg-emerald-100 text-emerald-700', barra: 'bg-emerald-500' },
}

/** Nome quando existe; senão o lugar; senão a senha (§10.1). */
function rotulo(p: Pedido): string {
  if (p.cliente_nome && p.cliente_nome.trim()) return p.cliente_nome
  const partes: string[] = []
  if (p.mesa_numero != null) partes.push(`Mesa ${p.mesa_numero}`)
  if (p.comanda_numero) partes.push(`Comanda ${p.comanda_numero}`)
  return partes.length ? partes.join(' · ') : `Senha ${p.senha}`
}

/**
 * Meus pedidos ativos, atualizando sozinho a cada 8s. Só leitura: quem chama o
 * cliente é o balcão — aqui o garçom quer saber se já pode buscar o prato.
 */
export default function PedidosPage() {
  const router = useRouter()
  const cor = COR_PADRAO

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const d = await apiBalcao.get('/pedidos?ativos=1&meus=1')
    if (!d?.success) setErro(d?.error || 'Não deu pra carregar seus pedidos agora.')
    else { setErro(''); setPedidos(d.pedidos || []) }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
    const id = setInterval(carregar, POLL_MS)
    return () => clearInterval(id)
  }, [carregar])

  const prontos = pedidos.filter((p) => p.status === 'pronto')

  return (
    <main className="min-h-screen">
      <AppHeader
        title="Meus pedidos"
        back="/balcao"
        right={
          <button onClick={carregar} aria-label="Atualizar" className="grid h-11 w-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <RefreshCw size={18} />
          </button>
        }
      />

      {prontos.length > 0 && (
        <div className="bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
          {prontos.length === 1 ? '1 pedido pronto pra buscar' : `${prontos.length} pedidos prontos pra buscar`}
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl space-y-2 p-3 sm:p-4">
        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
        ) : erro ? (
          <p className="py-16 text-center text-sm text-slate-400">{erro}</p>
        ) : pedidos.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <ListOrdered size={28} />
            </div>
            <p className="text-base font-semibold text-slate-900">Nenhum pedido em andamento</p>
            <p className="mt-1 text-sm text-slate-500">Os que você lançar aparecem aqui até saírem da cozinha.</p>
            <button
              onClick={() => router.push('/balcao/pedir')}
              className="mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-xl px-5 text-sm font-bold text-white active:scale-[0.99]"
              style={{ backgroundColor: cor }}
            >
              <Plus size={18} /> Anotar pedido
            </button>
          </div>
        ) : (
          pedidos.map((p) => {
            const st = STATUS[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600', barra: 'bg-slate-300' }
            return (
              <article key={p.codigo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                <div className={`h-1 ${st.barra}`} />
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
                      <span className="text-lg font-extrabold leading-none">{p.senha}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{rotulo(p)}</p>
                        <span className="shrink-0 text-xs text-slate-400">{tempoRelativo(p.criado_em)}</span>
                      </div>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {p.resumo && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.resumo}</p>}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{p.numero}</span>
                    <span className="text-sm font-bold text-slate-900">{brl(p.total)}</span>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </main>
  )
}
