'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, Share2, Plus, Minus, ImageIcon, Check } from 'lucide-react'
import { brl } from './theme'

/** `descricao` = descrição detalhada do produto (grade) — só existe em variação real. */
type Mod = { codigo: number; nome: string; preco_adicional: number; descricao?: string | null }
type Grupo = {
  codigo: number
  nome: string
  obrigatorio: boolean
  min_escolha: number
  max_escolha: number
  tipo_preco: string
  modificadores: Mod[]
}
type Produto = {
  codigo: number
  nome: string
  descricao: string | null
  preco: number
  preco_promocional?: number | null
  foto: string | null
  grupos?: Grupo[]
}

export type LinhaCarrinho = {
  id: string
  codigo: number
  nome: string
  foto: string | null
  qtde: number
  precoUnit: number
  modificadores: number[]
  modsResumo: string
  observacao?: string
  // Presente só em combos: escolhas por unidade (uma entrada por unidade do combo).
  combo?: { componentes: { produto: number; modificadores: number[] }[] }
}

const MAX_OBS = 120

function novaLinhaId(codigo: number): string {
  return `${codigo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function regraGrupo(g: Grupo): { texto: string; obrigatorio: boolean } {
  const min = g.obrigatorio ? Math.max(1, g.min_escolha) : g.min_escolha
  if (g.max_escolha <= 1) return { texto: 'Escolha 1', obrigatorio: min >= 1 }
  if (min >= 1 && min === g.max_escolha) return { texto: `Escolha ${g.max_escolha}`, obrigatorio: true }
  if (min >= 1) return { texto: `Escolha de ${min} a ${g.max_escolha}`, obrigatorio: true }
  return { texto: `Escolha até ${g.max_escolha}`, obrigatorio: false }
}
function dicaPreco(g: Grupo): string | null {
  const temPreco = g.modificadores.some((m) => Number(m.preco_adicional) > 0)
  if (!temPreco) return null
  if (g.tipo_preco === 'maior') return 'Cobramos pelo sabor mais caro'
  if (g.tipo_preco === 'media') return 'Cobramos a média dos escolhidos'
  return null
}
/**
 * Chips só pra escolha simples sem preço (ex.: "Ponto da carne", "Tamanho").
 * Sabores (maior/média) vão em LISTA, uma linha por opção: nome longo cabe
 * inteiro, o preço fica alinhado à direita e sobra espaço pra foto do sabor.
 */
function ehChips(g: Grupo): boolean {
  if (g.tipo_preco === 'maior' || g.tipo_preco === 'media') return false
  return g.modificadores.every((m) => Number(m.preco_adicional) === 0)
}
/** Em maior/média o preço da opção não é somado — mostrar "+" enganaria. */
function somaNoPreco(g: Grupo): boolean {
  return g.tipo_preco !== 'maior' && g.tipo_preco !== 'media'
}

/**
 * Tela cheia de detalhe do produto (estilo Anota AÍ / iFood — tela 4 do mockup).
 * Sabores em chips, adicionais em checkbox, observação com contador, quantidade.
 * A quantidade multiplica TUDO (2 pizzas com adicional cobram o adicional 2×).
 *
 * `embutido` = a mesma tela DENTRO de outra (o Novo pedido do Balcão): a altura
 * passa a ser a do container e o rodapé gruda no fim do scroll em vez de na
 * janela — sem isso o botão "Adicionar" ficaria colado na borda do navegador,
 * por cima do modal. Sem a prop, nada muda no app público.
 */
export default function ProdutoView({
  produto,
  cor,
  onVoltar,
  onAdd,
  embutido = false,
}: {
  produto: Produto
  cor: string
  onVoltar: () => void
  onAdd: (linha: LinhaCarrinho) => void
  embutido?: boolean
}) {
  const grupos = produto.grupos || []
  const emPromo =
    produto.preco_promocional != null && produto.preco_promocional > 0 && produto.preco_promocional < produto.preco
  const baseProduto = emPromo ? (produto.preco_promocional as number) : produto.preco

  const [sel, setSel] = useState<Record<number, number[]>>({})
  const [qtde, setQtde] = useState(1)
  const [obs, setObs] = useState('')
  const [tentou, setTentou] = useState(false)
  const refs = useRef<Record<number, HTMLDivElement | null>>({})

  function toggle(g: Grupo, codigo: number) {
    setSel((prev) => {
      const atual = prev[g.codigo] || []
      if (g.max_escolha <= 1) {
        if (atual.includes(codigo) && !g.obrigatorio) return { ...prev, [g.codigo]: [] }
        return { ...prev, [g.codigo]: [codigo] }
      }
      if (atual.includes(codigo)) return { ...prev, [g.codigo]: atual.filter((c) => c !== codigo) }
      if (atual.length >= g.max_escolha) return prev
      return { ...prev, [g.codigo]: [...atual, codigo] }
    })
  }

  const precoUnit = useMemo(() => {
    let unit = baseProduto
    for (const g of grupos) {
      const escolhidos = (sel[g.codigo] || [])
        .map((c) => g.modificadores.find((m) => m.codigo === c))
        .filter((m): m is Mod => !!m)
      if (!escolhidos.length) continue
      const precos = escolhidos.map((m) => Number(m.preco_adicional) || 0)
      if (g.tipo_preco === 'maior') unit += Math.max(...precos)
      else if (g.tipo_preco === 'media') unit += precos.reduce((a, b) => a + b, 0) / precos.length
      else unit += precos.reduce((a, b) => a + b, 0)
    }
    return Math.round(unit * 100) / 100
  }, [sel, grupos, baseProduto])

  const grupoFaltando = useMemo(() => {
    for (const g of grupos) {
      const n = (sel[g.codigo] || []).length
      const min = g.obrigatorio ? Math.max(1, g.min_escolha) : g.min_escolha
      if (n < min) return g
    }
    return null
  }, [sel, grupos])

  function adicionar() {
    if (grupoFaltando) {
      setTentou(true)
      refs.current[grupoFaltando.codigo]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const escolhidos = grupos.flatMap((g) => sel[g.codigo] || [])
    const resumo = grupos
      .flatMap((g) => (sel[g.codigo] || []).map((c) => g.modificadores.find((m) => m.codigo === c)?.nome))
      .filter(Boolean)
      .join(', ')
    onAdd({
      id: novaLinhaId(produto.codigo),
      codigo: produto.codigo,
      nome: produto.nome,
      foto: produto.foto,
      qtde,
      precoUnit,
      modificadores: escolhidos,
      modsResumo: resumo,
      observacao: obs.trim() || undefined,
    })
  }

  return (
    <div className={`bg-slate-50 ${embutido ? 'min-h-full pb-2' : 'min-h-screen pb-28'}`}>
      {/* Imagem topo */}
      <div className="relative h-56 sm:h-72 bg-slate-100">
        {produto.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.foto} alt={produto.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <button onClick={onVoltar} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {/* Compartilhar é do app público: dentro do Balcão a URL seria a da retaguarda. */}
        {!embutido && (
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? window.location.href : ''
              if (typeof navigator !== 'undefined' && (navigator as any).share) (navigator as any).share({ url }).catch(() => {})
              else navigator.clipboard?.writeText(url)
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 relative space-y-3">
        {/* Cabeçalho do produto */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h1 className="text-xl font-bold text-slate-900">{produto.nome}</h1>
          {produto.descricao && <p className="text-sm text-slate-500 mt-1 whitespace-pre-line break-words">{produto.descricao}</p>}
          {emPromo ? (
            <p className="text-base mt-2">
              <span className="text-slate-400 line-through mr-2">{brl(produto.preco)}</span>
              <span className="font-bold" style={{ color: cor }}>{brl(baseProduto)}</span>
            </p>
          ) : (
            <p className="text-base font-bold mt-2" style={{ color: cor }}>{brl(produto.preco)}</p>
          )}
        </div>

        {/* Grupos de complemento */}
        {grupos.map((g) => {
          const regra = regraGrupo(g)
          const dica = dicaPreco(g)
          const escolhidos = sel[g.codigo] || []
          const cheio = g.max_escolha > 1 && escolhidos.length >= g.max_escolha
          const faltaAqui = tentou && grupoFaltando?.codigo === g.codigo
          const minG = g.obrigatorio ? Math.max(1, g.min_escolha) : g.min_escolha
          const okGrupo = escolhidos.length >= minG
          // Cardinalidade ("Escolha 1", "Escolha de 2 a 3") só quando agrega info.
          const helper = [regra.obrigatorio || g.max_escolha > 1 ? regra.texto : null, dica].filter(Boolean).join(' · ')
          return (
            <div
              key={g.codigo}
              ref={(el) => { refs.current[g.codigo] = el }}
              className={`bg-white rounded-2xl border p-4 ${faltaAqui ? 'border-rose-200' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{g.nome}</p>
                  {helper && <p className="text-[11px] text-slate-400 mt-0.5">{helper}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {g.max_escolha > 1 && <span className="text-[11px] text-slate-400">{escolhidos.length}/{g.max_escolha}</span>}
                  {regra.obrigatorio ? (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        okGrupo ? 'bg-emerald-100 text-emerald-700' : faltaAqui ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {okGrupo && <Check className="w-3 h-3" />}
                      Obrigatório
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Opcional</span>
                  )}
                </div>
              </div>

              {ehChips(g) ? (
                <div className="flex flex-wrap gap-2">
                  {g.modificadores.map((m) => {
                    const checked = escolhidos.includes(m.codigo)
                    const bloqueado = cheio && !checked
                    return (
                      <button
                        key={m.codigo}
                        onClick={() => !bloqueado && toggle(g, m.codigo)}
                        disabled={bloqueado}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          checked ? 'text-white border-transparent' : bloqueado ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700'
                        }`}
                        style={checked ? { backgroundColor: cor, borderColor: cor } : {}}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                        {m.nome}
                        {Number(m.preco_adicional) > 0 && (
                          <span className={checked ? 'text-white/90' : 'text-slate-400'}>+{brl(m.preco_adicional)}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="-mx-1">
                  {g.modificadores.map((m) => {
                    const checked = escolhidos.includes(m.codigo)
                    const radio = g.max_escolha <= 1
                    const bloqueado = cheio && !checked
                    return (
                      <button
                        key={m.codigo}
                        onClick={() => !bloqueado && toggle(g, m.codigo)}
                        disabled={bloqueado}
                        className={`w-full px-1 py-2.5 flex items-center justify-between gap-3 text-left border-b border-slate-50 last:border-0 ${
                          bloqueado ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm text-slate-800">{m.nome}</span>
                          {/* Descrição detalhada do produto (ex.: ingredientes), recuada
                              e em itálico embaixo do sabor — padrão iFood. */}
                          {m.descricao && (
                            <span className="block pl-3 mt-0.5 text-[11px] italic text-slate-400 leading-snug">{m.descricao}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          {Number(m.preco_adicional) > 0 && (
                            <span className="text-sm text-slate-500">{somaNoPreco(g) ? '+ ' : ''}{brl(m.preco_adicional)}</span>
                          )}
                          <span
                            className={`w-5 h-5 flex items-center justify-center border-2 ${radio ? 'rounded-full' : 'rounded'} ${
                              checked ? 'border-transparent' : 'border-slate-300'
                            }`}
                            style={checked ? { backgroundColor: cor } : {}}
                          >
                            {checked && <Check className="w-3.5 h-3.5 text-white" />}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Observações */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <label className="text-sm font-bold text-slate-900">Alguma observação?</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.slice(0, MAX_OBS))}
            maxLength={MAX_OBS}
            rows={2}
            placeholder="Ex: sem cebola, bem passado…"
            className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <div className="text-right text-[11px] text-slate-400 mt-0.5">{obs.length}/{MAX_OBS}</div>
        </div>
      </div>

      {/* Footer fixo (embutido: gruda no fim do scroll do container, não da janela) */}
      <div className={`border-t border-slate-100 bg-white p-3 ${embutido ? 'sticky bottom-0' : 'fixed bottom-0 left-0 right-0'}`}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setQtde((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
            <span className="w-6 text-center font-bold">{qtde}</span>
            <button onClick={() => setQtde((q) => q + 1)} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
          </div>
          <button
            onClick={adicionar}
            className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-between px-4"
            style={{ backgroundColor: grupoFaltando ? '#9ca3af' : cor }}
          >
            <span>{grupoFaltando ? `Escolha: ${grupoFaltando.nome}` : 'Adicionar ao carrinho'}</span>
            {!grupoFaltando && <span>{brl(precoUnit * qtde)}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
