import { NextRequest, NextResponse } from 'next/server'
import { withGarcom } from '@/lib/with-garcom'
import { getContext } from '@/lib/request-context'
import { RETAGUARDA_URL, retaguardaConfigurada, assinarTokenRetaguarda } from '@/lib/retaguarda'
import type { GarcomPayload } from '@/lib/garcom-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PROXY `/api/balcao/**` → `RETAGUARDA_URL/api/balcao/garcom/**`.
 *
 * Por que um proxy em vez de o front chamar a retaguarda direto:
 *  - o Bearer da retaguarda NUNCA chega ao navegador. Ele é assinado aqui, no
 *    servidor, a partir da sessão de vendedor que já existe em cookie httpOnly;
 *  - do ponto de vista do front tudo é same-origin, então não há CORS nem
 *    preflight em cada tela;
 *  - a autorização continua sendo a deste app: `withGarcom` exige empresa
 *    (AUTH_TOKEN) E vendedor (GARCOM_VENDEDOR) antes de qualquer coisa sair.
 *
 * O caminho é repassado inteiro: `/api/balcao/pedidos?ativos=1` vira
 * `/api/balcao/garcom/pedidos?ativos=1` lá.
 */

/** A retaguarda pode estar em outra VPS: 20s cobre cold start sem prender a tela. */
const TIMEOUT_MS = 20_000

const indisponivel = (motivo: string) => {
  console.error('[balcao] retaguarda indisponivel:', motivo)
  return NextResponse.json({ success: false, error: 'retaguarda_indisponivel' }, { status: 502 })
}

/**
 * As fotos do cardápio voltam como caminho relativo (`/upload/...`), que no
 * navegador do garçom apontaria pra ESTE app — onde os arquivos não existem.
 * Reescreve pra URL absoluta da retaguarda, que é quem serve a imagem.
 */
function absolutizarUploads(valor: any): any {
  if (typeof valor === 'string') {
    return valor.startsWith('/upload/') ? `${RETAGUARDA_URL}${valor}` : valor
  }
  if (Array.isArray(valor)) return valor.map(absolutizarUploads)
  if (valor && typeof valor === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(valor)) out[k] = absolutizarUploads(v)
    return out
  }
  return valor
}

async function encaminhar(
  req: NextRequest,
  ctx: { vendedor: GarcomPayload },
  params: any,
  metodo: 'GET' | 'POST' | 'PUT'
): Promise<NextResponse> {
  if (!retaguardaConfigurada()) {
    return NextResponse.json(
      { success: false, error: 'retaguarda_nao_configurada' },
      { status: 503 }
    )
  }

  const partes: string[] = Array.isArray(params?.path) ? params.path : []
  // Nada de `..` no caminho: o path vem da URL e não pode escapar do prefixo.
  if (partes.some((p) => p === '..' || p.includes('/'))) {
    return NextResponse.json({ success: false, error: 'caminho_invalido' }, { status: 400 })
  }

  const { tenantId, cnpj } = getContext()
  const token = await assinarTokenRetaguarda({
    tid: String(tenantId),
    cnpj: cnpj || '',
    // `vendedores.codigo` daqui vira o `operador` do pedido na retaguarda.
    oid: ctx.vendedor.codigo,
    nome: ctx.vendedor.nome,
  })

  const busca = new URL(req.url).search
  const destino = `${RETAGUARDA_URL}/api/balcao/garcom/${partes.join('/')}${busca}`

  const corpo = metodo === 'GET' ? undefined : await req.text()

  let resposta: Response
  try {
    resposta = await fetch(destino, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: corpo,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e: any) {
    return indisponivel(e?.name === 'TimeoutError' ? `timeout em ${destino}` : e?.message || 'fetch falhou')
  }

  const texto = await resposta.text()
  let json: any
  try {
    json = texto ? JSON.parse(texto) : {}
  } catch {
    // HTML de erro do nginx, página 404 do Next: pra este app é indisponibilidade.
    return indisponivel(`resposta nao-JSON (${resposta.status})`)
  }

  // Status repassado tal e qual: 409 de regra de mesa/comanda tem que chegar
  // como 409 no front, com o `codigo` e a `sugestao` que a §10 define.
  return NextResponse.json(absolutizarUploads(json), { status: resposta.status })
}

export const GET = withGarcom((req, ctx, params) => encaminhar(req, ctx, params, 'GET'))
export const POST = withGarcom((req, ctx, params) => encaminhar(req, ctx, params, 'POST'))
export const PUT = withGarcom((req, ctx, params) => encaminhar(req, ctx, params, 'PUT'))
