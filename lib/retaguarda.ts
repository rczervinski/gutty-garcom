import { SignJWT } from 'jose'

/**
 * Ponte com a RETAGUARDA (modo "delivery com balcão").
 *
 * O modo tradicional deste app grava direto em `pedidos_terminal`, no banco do
 * tenant. O modo balcão é outra coisa: o cardápio, as mesas, as comandas e o
 * Kanban vivem na retaguarda (outro projeto, outra VPS), então aqui o app é um
 * CLIENTE dela — não replica regra nenhuma.
 *
 * Credencial: a retaguarda expõe `/api/balcao/garcom/**` protegido por Bearer
 * (ver `lib/balcao/garcom-auth.ts` lá). O token é assinado AQUI, com o segredo
 * compartilhado, e tem que carregar EXATAMENTE o payload que ela valida:
 * `{ tid, cnpj, oid, nome }`. `oid` é o `vendedores.codigo` deste app — é assim
 * que o pedido nasce com o nome do garçom certo no card do balcão.
 */

/** URL pública da retaguarda, sem barra no fim. */
export const RETAGUARDA_URL = String(process.env.RETAGUARDA_URL || '').replace(/\/+$/, '')

export function retaguardaConfigurada(): boolean {
  return RETAGUARDA_URL.length > 0
}

/**
 * Segredo compartilhado com a retaguarda. Lá é `AUTH_OP_SECRET || AUTH_JWT_SECRET`;
 * aqui é `RETAGUARDA_GARCOM_SECRET || AUTH_JWT_SECRET`. Se os dois lados usam o
 * mesmo `AUTH_JWT_SECRET`, funciona sem configurar nada a mais — mas quando a
 * retaguarda tem `AUTH_OP_SECRET` próprio, é ELE que precisa vir pra cá.
 */
const SECRET = process.env.RETAGUARDA_GARCOM_SECRET || process.env.AUTH_JWT_SECRET
if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production' && retaguardaConfigurada()) {
    throw new Error(
      'RETAGUARDA_GARCOM_SECRET (ou AUTH_JWT_SECRET) precisa ter >= 32 chars quando RETAGUARDA_URL está definida'
    )
  }
}
const KEY = new TextEncoder().encode(SECRET || 'dev-only-insecure-secret-32chars')

/** 12h, igual à sessão do vendedor — o token morre junto com o turno. */
const TTL_SEGUNDOS = 60 * 60 * 12
/** Renova com 10 min de folga: nenhuma requisição sai com token quase vencido. */
const FOLGA_MS = 10 * 60 * 1000

export type PayloadRetaguarda = {
  tid: string
  cnpj: string
  /** `vendedores.codigo` daqui = `operador` do pedido lá. */
  oid: number
  nome: string
}

/**
 * Cache por (tenant, vendedor). Assinar JWT é barato, mas isto roda em TODA
 * chamada do proxy — e cada tela do garçom faz várias. Guardar até faltar 10
 * min pra expirar troca N assinaturas por dia por uma.
 */
const cache = new Map<string, { token: string; expiraEm: number }>()

export async function assinarTokenRetaguarda(p: PayloadRetaguarda): Promise<string> {
  const chave = `${p.tid}:${p.oid}`
  const agora = Date.now()

  const hit = cache.get(chave)
  if (hit && hit.expiraEm - FOLGA_MS > agora) return hit.token

  const token = await new SignJWT({ tid: p.tid, cnpj: p.cnpj, oid: p.oid, nome: p.nome } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(agora / 1000) + TTL_SEGUNDOS)
    .sign(KEY)

  cache.set(chave, { token, expiraEm: agora + TTL_SEGUNDOS * 1000 })
  return token
}

/** Esquece o token de um vendedor (logout, ou 401 vindo da retaguarda). */
export function limparTokenRetaguarda(tid: string, oid: number) {
  cache.delete(`${tid}:${oid}`)
}
