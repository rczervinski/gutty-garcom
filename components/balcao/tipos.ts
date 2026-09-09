import type { LinhaCarrinho } from './ProdutoView'

/**
 * Modo DELIVERY COM BALCÃO — tipos do fluxo de pedido.
 *
 * O cardápio, as comandas e as mesas vêm da retaguarda (Gutty Delivery) através
 * do proxy same-origin `/api/balcao/**`: o navegador só manda o cookie que este
 * app já tem, sem token nem sessão paralela.
 *
 * Contrato: `_port-retaguarda/BALCAO_ARQUITETURA.md` §5, §10 e §13.
 */

/** Caminhos relativos à base do balcão: '/cardapio', '/pedidos', '/mesas'… */
export type ApiPedido = {
  get: (caminho: string) => Promise<any>
  post: (caminho: string, corpo: any) => Promise<any>
}

export type Categoria = { codigo: number; nome: string; ordem: number; parent: number | null }
export type Produto = {
  codigo: number; categoria: number | null; nome: string; descricao: string | null
  preco: number; preco_promocional?: number | null; foto: string | null
  destaque?: boolean; tipo?: string; grupos?: any[]; componentes?: any[]
}
export type ComandaAberta = { codigo: number; numero: string; mesa_numero: number | null; cliente_nome: string | null }
export type MesaAberta = {
  codigo: number; numero: number; nome: string | null
  modo?: 'conta' | 'comandas' | 'vazia'
  comandas?: { codigo: number }[]
}

// ── Identificação (contrato §10) ──────────────────────────────────────────
// Quem decide mesa × comanda é o servidor. O formulário só OBEDECE: preenche,
// trava e mostra o erro que vier.
export type ComandaIdent = {
  codigo: number; numero: string; mesa_numero?: number | null
  cliente_nome: string | null; cliente_fone: string | null; cliente_cpf: string | null
  total?: number; qtd_pedidos?: number; situacao?: string
}
export type MesaIdent = {
  codigo: number; numero: number; nome: string | null; fone: string | null; cpf: string | null
  modo: 'conta' | 'comandas' | 'vazia'
  comandas: ComandaIdent[]
  proxima_comanda: string | null
}
export type Identificacao = {
  mesa: MesaIdent | null
  comanda: ComandaIdent | null
  cliente_travado: { nome: string | null; fone: string | null; cpf: string | null; origem: 'comanda' | 'mesa' } | null
  mesa_travada: number | null
  comanda_travada: boolean
  erro: { codigo: string; mensagem: string; sugestao?: string | null } | null
}

/** O que já se sabe antes de abrir (veio da mesa/comanda escolhida). */
export type PrefillPedido = {
  mesa_numero?: number | null
  comanda_numero?: string | null
  comanda_codigo?: number | null
  cliente?: { nome?: string | null; telefone?: string | null; cpf?: string | null } | null
}

/** O que a identificação resolveu — vai direto pro corpo do POST. */
export type IdentificacaoValor = {
  cliente: { nome?: string; telefone?: string; cpf?: string }
  mesa_numero?: number
  comanda_codigo?: number
  comanda_numero?: string
  /** true = tem erro de mesa × comanda; não dá pra enviar. */
  bloqueado: boolean
  validando: boolean
  /** "Mesa 6 · Comanda 3" / "Avulso" — pro resumo e pra tela da senha. */
  rotulo: string
  nome: string
}

export const IDENT_VAZIA: IdentificacaoValor = {
  cliente: {}, bloqueado: false, validando: false, rotulo: 'Avulso', nome: '',
}

export const MAX_OBS = 160

export function soDigitos(s: string): string { return String(s || '').replace(/\D/g, '') }
/** (00) 90000-0000 conforme digita — o estado guarda só os dígitos. */
export function mascararFone(s: string): string {
  const d = soDigitos(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
export function mascararCpf(s: string): string {
  const d = soDigitos(s).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/**
 * Uma chave por pedido. Reenvio (resposta perdida + segundo toque) manda a MESMA
 * chave e o servidor devolve o mesmo pedido — o salão não ganha pedido dobrado.
 */
export function novaIdemKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') return (crypto as any).randomUUID()
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Carrinho → `itens` do POST (combo vai com componentes; item normal com mods). */
export function itensDoPedido(cart: LinhaCarrinho[]): any[] {
  return cart.map((i) =>
    i.combo
      ? { combo: i.codigo, qtde: i.qtde, observacao: i.observacao, componentes: i.combo.componentes }
      : { codigo: i.codigo, qtde: i.qtde, observacao: i.observacao, modificadores: i.modificadores }
  )
}

/** Tempo curto desde um timestamp do servidor ("5 min", "2h05"). */
export function tempoRelativo(valor: string | null | undefined): string {
  if (!valor) return ''
  const s = String(valor).trim()
  // Timestamp "naive" do banco é UTC: sem o Z, o navegador leria como local.
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/(z|[+-]\d{2}:?\d{2})$/i.test(s)
    ? s.replace(' ', 'T') + 'Z'
    : s
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

/** Só a hora (HH:mm) de um timestamp do servidor. */
export function horaDe(valor: string | null | undefined): string {
  if (!valor) return ''
  const s = String(valor).trim()
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/(z|[+-]\d{2}:?\d{2})$/i.test(s)
    ? s.replace(' ', 'T') + 'Z'
    : s
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}

export type { LinhaCarrinho }
