'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, ImageIcon, Plus, AlertTriangle } from 'lucide-react'
import ProdutoView from './ProdutoView'
import ComboView from './ComboView'
import { brl, emPromo, COR_PADRAO } from './theme'
import type { ApiPedido, Categoria, LinhaCarrinho, Produto } from './tipos'

/**
 * Cardápio do modo delivery: busca, abas (categoria raiz), seções e o detalhe do
 * produto com complementos — a mesma tela que o cliente vê no app da loja.
 *
 * `produtoAtivo` é controlado pela página porque quem desenha o cabeçalho precisa
 * saber se está no detalhe.
 */
export default function Cardapio({
  api,
  cor = COR_PADRAO,
  produtoAtivo,
  onAbrirProduto,
  onAdicionar,
  onCor,
}: {
  api: ApiPedido
  cor?: string
  produtoAtivo: Produto | null
  onAbrirProduto: (p: Produto | null) => void
  onAdicionar: (linha: LinhaCarrinho) => void
  /** Devolve a cor de tema da loja quando o cardápio responde. */
  onCor?: (cor: string) => void
}) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [tabAtiva, setTabAtiva] = useState<number | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const d = await api.get('/cardapio')
      if (!vivo) return
      if (!d?.success) setErro(d?.error || 'Não foi possível carregar o cardápio')
      else {
        setCategorias(d.categorias || [])
        setProdutos((d.produtos || []).map((p: any) => ({ ...p, preco: Number(p.preco) })))
        if (d.config?.cor_tema) onCor?.(String(d.config.cor_tema))
      }
      setCarregando(false)
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buscaLower = busca.trim().toLowerCase()
  const produtosVisiveis = buscaLower
    ? produtos.filter((p) => p.nome.toLowerCase().includes(buscaLower) || (p.descricao || '').toLowerCase().includes(buscaLower))
    : produtos

  const { abas, secoesDaAba } = useMemo(() => {
    const catByCodigo = new Map(categorias.map((c) => [c.codigo, c]))
    const tabDoProduto = (p: Produto): number | null => {
      const cat = p.categoria != null ? catByCodigo.get(p.categoria) : null
      if (!cat) return null
      return cat.parent != null ? cat.parent : cat.codigo
    }
    const semCat = produtosVisiveis.filter((p) => tabDoProduto(p) == null)
    const lista: { codigo: number; nome: string }[] = [
      ...categorias
        .filter((c) => c.parent == null)
        .filter((t) => produtosVisiveis.some((p) => tabDoProduto(p) === t.codigo))
        .map((t) => ({ codigo: t.codigo, nome: t.nome })),
      ...(semCat.length > 0 ? [{ codigo: -1, nome: 'Outros' }] : []),
    ]
    function secoes(tabCodigo: number): { codigo: number; nome: string; itens: Produto[] }[] {
      if (tabCodigo === -1) return semCat.length ? [{ codigo: -1, nome: '', itens: semCat }] : []
      const out: { codigo: number; nome: string; itens: Produto[] }[] = []
      const direto = produtosVisiveis.filter((p) => p.categoria === tabCodigo)
      if (direto.length) out.push({ codigo: tabCodigo, nome: '', itens: direto })
      for (const s of categorias.filter((c) => c.parent === tabCodigo)) {
        const itens = produtosVisiveis.filter((p) => p.categoria === s.codigo)
        if (itens.length) out.push({ codigo: s.codigo, nome: s.nome, itens })
      }
      return out
    }
    return { abas: lista, secoesDaAba: secoes }
  }, [categorias, produtosVisiveis])

  const tabAtivaEf = tabAtiva != null && abas.some((a) => a.codigo === tabAtiva) ? tabAtiva : abas[0]?.codigo ?? null

  function cardProduto(p: Produto) {
    return (
      <button
        key={p.codigo}
        onClick={() => onAbrirProduto(p)}
        className="flex min-h-[80px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-card transition hover:border-primary-200 hover:shadow-card-hover active:scale-[0.99]"
      >
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.foto} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold text-slate-900">{p.nome}</p>
          {p.descricao && <p className="line-clamp-2 text-xs text-slate-500">{p.descricao}</p>}
          {emPromo(p) ? (
            <p className="mt-0.5 text-sm">
              <span className="mr-1.5 text-slate-400 line-through">{brl(p.preco)}</span>
              <span className="font-bold" style={{ color: cor }}>{brl(p.preco_promocional)}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-bold" style={{ color: cor }}>{brl(p.preco)}</p>
          )}
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: cor }}>
          <Plus size={20} />
        </span>
      </button>
    )
  }

  // ── Detalhe do produto / combo ───────────────────────────────────────────
  if (produtoAtivo) {
    const fechar = () => onAbrirProduto(null)
    return (
      <div className="h-full min-h-0 overflow-y-auto">
        {produtoAtivo.tipo === 'combo' ? (
          <ComboView embutido combo={produtoAtivo as any} cor={cor} onVoltar={fechar} onAdd={onAdicionar} />
        ) : (
          <ProdutoView embutido produto={produtoAtivo as any} cor={cor} onVoltar={fechar} onAdd={onAdicionar} />
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto…"
            className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
          />
        </div>
        {!buscaLower && abas.length > 1 && (
          <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1">
            {abas.map((a) => {
              const on = tabAtivaEf === a.codigo
              return (
                <button
                  key={a.codigo}
                  onClick={() => setTabAtiva(a.codigo)}
                  className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition ${
                    on ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                  style={on ? { backgroundColor: cor } : undefined}
                >
                  {a.nome}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" size={24} style={{ color: cor }} /></div>
        ) : erro ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0" /> {erro}
          </div>
        ) : buscaLower ? (
          produtosVisiveis.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Nenhum item encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{produtosVisiveis.map(cardProduto)}</div>
          )
        ) : produtos.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Cardápio em montagem.</p>
        ) : (
          <div className="space-y-5">
            {tabAtivaEf != null && secoesDaAba(tabAtivaEf).map((sec) => (
              <div key={sec.codigo}>
                {sec.nome && <h3 className="mb-2 text-base font-semibold text-slate-900">{sec.nome}</h3>}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{sec.itens.map(cardProduto)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
