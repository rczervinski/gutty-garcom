'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, Plus, Minus, ImageIcon, Check } from 'lucide-react'
import { brl, emPromo, efetivo } from './theme'
import type { LinhaCarrinho } from './ProdutoView'

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
type Componente = { produto: number; nome: string; foto: string | null; quantidade: number; rotulo: string | null; grupos: Grupo[] }
type Combo = { codigo: number; nome: string; descricao: string | null; preco: number; preco_promocional?: number | null; foto: string | null; componentes?: Componente[] }

type Unidade = { idx: number; produto: number; titulo: string; foto: string | null; grupos: Grupo[] }

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
/** Mesma regra do ProdutoView: sabores (maior/média) em lista, não em chips. */
function ehChips(g: Grupo): boolean {
  if (g.tipo_preco === 'maior' || g.tipo_preco === 'media') return false
  return g.modificadores.every((m) => Number(m.preco_adicional) === 0)
}
/** Em maior/média o preço da opção não é somado — mostrar "+" enganaria. */
function somaNoPreco(g: Grupo): boolean {
  return g.tipo_preco !== 'maior' && g.tipo_preco !== 'media'
}
function contribGrupo(g: Grupo, ids: number[]): number {
  if (!ids.length) return 0
  const precos = ids.map((id) => Number(g.modificadores.find((m) => m.codigo === id)?.preco_adicional) || 0)
  if (g.tipo_preco === 'maior') return Math.max(...precos)
  if (g.tipo_preco === 'media') return precos.reduce((a, b) => a + b, 0) / precos.length
  return precos.reduce((a, b) => a + b, 0)
}

/**
 * Tela cheia do COMBO (estilo iFood). Expande cada componente pela quantidade em
 * seções (ex.: "Pizza 1", "Pizza 2", "Refrigerante"), cada uma escolhendo seus
 * sabores/adicionais. Preço = preço do combo (fixo) + adicionais de cada unidade.
 */
export default function ComboView({
  combo,
  cor,
  onVoltar,
  onAdd,
  embutido = false,
}: {
  combo: Combo
  cor: string
  onVoltar: () => void
  onAdd: (linha: LinhaCarrinho) => void
  /** Mesma tela DENTRO de outra (Novo pedido do Balcão) — ver ProdutoView. */
  embutido?: boolean
}) {
  const unidades: Unidade[] = useMemo(() => {
    const arr: Unidade[] = []
    let idx = 0
    for (const c of combo.componentes || []) {
      const q = Math.max(1, Number(c.quantidade) || 1)
      for (let k = 0; k < q; k++) {
        const titulo = c.rotulo || (q > 1 ? `${c.nome} ${k + 1}` : c.nome)
        arr.push({ idx: idx++, produto: c.produto, titulo, foto: c.foto, grupos: c.grupos || [] })
      }
    }
    return arr
  }, [combo])

  const [sel, setSel] = useState<Record<number, Record<number, number[]>>>({})
  const [obs, setObs] = useState('')
  const [tentou, setTentou] = useState(false)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  function toggle(uIdx: number, g: Grupo, codigo: number) {
    setSel((prev) => {
      const doUnidade = prev[uIdx] || {}
      const atual = doUnidade[g.codigo] || []
      let nova: number[]
      if (g.max_escolha <= 1) {
        nova = atual.includes(codigo) && !g.obrigatorio ? [] : [codigo]
      } else if (atual.includes(codigo)) {
        nova = atual.filter((c) => c !== codigo)
      } else if (atual.length >= g.max_escolha) {
        return prev
      } else {
        nova = [...atual, codigo]
      }
      return { ...prev, [uIdx]: { ...doUnidade, [g.codigo]: nova } }
    })
  }

  const precoTotal = useMemo(() => {
    let extra = 0
    for (const u of unidades) {
      for (const g of u.grupos) extra += contribGrupo(g, sel[u.idx]?.[g.codigo] || [])
    }
    return Math.round((efetivo(combo) + extra) * 100) / 100
  }, [sel, unidades, combo])

  const faltando = useMemo(() => {
    for (const u of unidades) {
      for (const g of u.grupos) {
        const n = (sel[u.idx]?.[g.codigo] || []).length
        const min = g.obrigatorio ? Math.max(1, g.min_escolha) : g.min_escolha
        if (n < min) return { u, g }
      }
    }
    return null
  }, [sel, unidades])

  function adicionar() {
    if (faltando) {
      setTentou(true)
      refs.current[`${faltando.u.idx}:${faltando.g.codigo}`]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const componentes = unidades.map((u) => ({
      produto: u.produto,
      modificadores: u.grupos.flatMap((g) => sel[u.idx]?.[g.codigo] || []),
    }))
    const resumo = unidades
      .map((u) => {
        const nomes = u.grupos
          .flatMap((g) => (sel[u.idx]?.[g.codigo] || []).map((c) => g.modificadores.find((m) => m.codigo === c)?.nome))
          .filter(Boolean)
        return nomes.length ? `${u.titulo}: ${nomes.join(', ')}` : u.titulo
      })
      .join(' · ')
    onAdd({
      id: novaLinhaId(combo.codigo),
      codigo: combo.codigo,
      nome: combo.nome,
      foto: combo.foto,
      qtde: 1,
      precoUnit: precoTotal,
      modificadores: [],
      modsResumo: resumo,
      observacao: obs.trim() || undefined,
      combo: { componentes },
    })
  }

  return (
    <div className={`bg-slate-50 ${embutido ? 'min-h-full pb-2' : 'min-h-screen pb-28'}`}>
      {/* Imagem topo */}
      <div className="relative h-56 sm:h-72 bg-slate-100">
        {combo.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={combo.foto} alt={combo.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <button onClick={onVoltar} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 relative space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Combo</span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{combo.nome}</h1>
          {combo.descricao && <p className="text-sm text-slate-500 mt-1 whitespace-pre-line break-words">{combo.descricao}</p>}
          {emPromo(combo) ? (
            <p className="text-base mt-2">
              <span className="text-slate-400 line-through mr-2">{brl(combo.preco)}</span>
              <span className="font-bold" style={{ color: cor }}>{brl(efetivo(combo))}</span>
            </p>
          ) : (
            <p className="text-base font-bold mt-2" style={{ color: cor }}>{brl(combo.preco)}</p>
          )}
          {unidades.length > 0 && <p className="text-xs text-slate-400 mt-1">Escolha as opções de cada item do combo.</p>}
        </div>

        {unidades.map((u) => (
          <div key={u.idx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                {u.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.foto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                )}
              </div>
              <span className="text-sm font-bold text-slate-900">{u.titulo}</span>
            </div>

            {u.grupos.length === 0 && <p className="px-4 py-3 text-xs text-slate-400">Sem opções pra escolher.</p>}

            {u.grupos.map((g) => {
              const regra = regraGrupo(g)
              const escolhidos = sel[u.idx]?.[g.codigo] || []
              const cheio = g.max_escolha > 1 && escolhidos.length >= g.max_escolha
              const faltaAqui = tentou && faltando?.u.idx === u.idx && faltando?.g.codigo === g.codigo
              return (
                <div key={g.codigo} ref={(el) => { refs.current[`${u.idx}:${g.codigo}`] = el }} className={`p-4 border-t border-slate-50 ${faltaAqui ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <p className="text-sm font-bold text-slate-900">{g.nome}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.max_escolha > 1 && <span className="text-[11px] text-slate-400">{escolhidos.length}/{g.max_escolha}</span>}
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${regra.obrigatorio ? (faltaAqui ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600') : 'bg-slate-100 text-slate-400'}`}>
                        {regra.obrigatorio ? (faltaAqui ? 'Obrigatório' : regra.texto) : 'Opcional'}
                      </span>
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
                            onClick={() => !bloqueado && toggle(u.idx, g, m.codigo)}
                            disabled={bloqueado}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                              checked ? 'text-white border-transparent' : bloqueado ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700'
                            }`}
                            style={checked ? { backgroundColor: cor, borderColor: cor } : {}}
                          >
                            {checked && <Check className="w-3.5 h-3.5" />}
                            {m.nome}
                            {Number(m.preco_adicional) > 0 && <span className={checked ? 'text-white/90' : 'text-slate-400'}>+{brl(m.preco_adicional)}</span>}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div>
                      {g.modificadores.map((m) => {
                        const checked = escolhidos.includes(m.codigo)
                        const radio = g.max_escolha <= 1
                        const bloqueado = cheio && !checked
                        return (
                          <button
                            key={m.codigo}
                            onClick={() => !bloqueado && toggle(u.idx, g, m.codigo)}
                            disabled={bloqueado}
                            className={`w-full py-2.5 flex items-center justify-between gap-3 text-left border-b border-slate-50 last:border-0 ${bloqueado ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm text-slate-800">{m.nome}</span>
                              {m.descricao && (
                                <span className="block pl-3 mt-0.5 text-[11px] italic text-slate-400 leading-snug">{m.descricao}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-3 shrink-0">
                              {Number(m.preco_adicional) > 0 && (
                                <span className="text-sm text-slate-500">{somaNoPreco(g) ? '+ ' : ''}{brl(m.preco_adicional)}</span>
                              )}
                              <span className={`w-5 h-5 flex items-center justify-center border-2 ${radio ? 'rounded-full' : 'rounded'} ${checked ? 'border-transparent' : 'border-slate-300'}`} style={checked ? { backgroundColor: cor } : {}}>
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
          </div>
        ))}

        {/* Observações */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <label className="text-sm font-bold text-slate-900">Alguma observação?</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.slice(0, MAX_OBS))}
            maxLength={MAX_OBS}
            rows={2}
            placeholder="Ex: sem cebola na pizza 2…"
            className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <div className="text-right text-[11px] text-slate-400 mt-0.5">{obs.length}/{MAX_OBS}</div>
        </div>
      </div>

      {/* Footer fixo (embutido: gruda no fim do scroll do container, não da janela) */}
      <div className={`border-t border-slate-100 bg-white p-3 ${embutido ? 'sticky bottom-0' : 'fixed bottom-0 left-0 right-0'}`}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={adicionar}
            className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-between px-4"
            style={{ backgroundColor: faltando ? '#9ca3af' : cor }}
          >
            <span>{faltando ? `Escolha: ${faltando.g.nome}` : 'Adicionar ao carrinho'}</span>
            {!faltando && <span>{brl(precoTotal)}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
