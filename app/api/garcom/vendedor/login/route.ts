import { NextRequest, NextResponse } from 'next/server'
import { withTenant } from '@/lib/with-tenant'
import { query } from '@/lib/database'
import { signGarcomToken, attachGarcomCookie } from '@/lib/garcom-auth'
import { getContext } from '@/lib/request-context'

export const runtime = 'nodejs'

/**
 * POST /api/garcom/vendedor/login
 * Body: { codigo, senha }
 * Valida em `vendedores` (senha texto plano — padrão legado C).
 * Em sucesso, emite cookie GARCOM_VENDEDOR e retorna o nome do vendedor.
 *
 * Exige o login de empresa (AUTH_TOKEN) — withTenant resolve o banco do tenant.
 */
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const codigo = parseInt(body?.codigo)
  const senha = typeof body?.senha === 'string' ? body.senha : ''

  if (!codigo || !senha) {
    return NextResponse.json({ success: false, error: 'Informe código e senha' }, { status: 400 })
  }

  const r = await query(
    `SELECT codigo, nome
       FROM vendedores
      WHERE codigo = $1 AND senha = $2 AND COALESCE(inativo, 0) = 0
      LIMIT 1`,
    [codigo, senha]
  )

  if (r.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Código ou senha inválidos' }, { status: 401 })
  }

  const vendedor = {
    codigo: Number(r.rows[0].codigo),
    nome: String(r.rows[0].nome || `Vendedor ${r.rows[0].codigo}`),
  }

  const tid = getContext().tenantId as string
  const token = await signGarcomToken({ tid, codigo: vendedor.codigo, nome: vendedor.nome })

  const res = NextResponse.json({ success: true, vendedor })
  attachGarcomCookie(res, token)
  return res
})
