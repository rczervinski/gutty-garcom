import { NextRequest, NextResponse } from 'next/server'
import { withTenant } from '@/lib/with-tenant'
import { query } from '@/lib/database'
import { signGarcomToken, attachGarcomCookie } from '@/lib/garcom-auth'
import { getContext } from '@/lib/request-context'

export const runtime = 'nodejs'

/**
 * POST /api/garcom/vendedor/login
 * Body: { vendedor, senha }   (aceita CÓDIGO ou NOME no campo `vendedor`)
 *
 * Alinhado com o sistema de produção (login por nome+senha) e com a opção de
 * código: o campo `vendedor` casa por código (se numérico) OU por nome.
 * Senha em texto plano — padrão legado C.
 * Exige o login de empresa (AUTH_TOKEN) — withTenant resolve o banco do tenant.
 */
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const raw = String(body?.vendedor ?? body?.codigo ?? '').trim()
  const senha = typeof body?.senha === 'string' ? body.senha : ''

  if (!raw || !senha) {
    return NextResponse.json({ success: false, error: 'Informe o vendedor e a senha' }, { status: 400 })
  }

  const codigoNum = /^\d+$/.test(raw) ? Number(raw) : null

  const r = await query(
    `SELECT codigo, nome
       FROM vendedores
      WHERE senha = $1
        AND COALESCE(inativo, 0) = 0
        AND ( ($2::int IS NOT NULL AND codigo = $2::int) OR upper(nome) = upper($3) )
      ORDER BY codigo
      LIMIT 1`,
    [senha, codigoNum, raw]
  )

  if (r.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Vendedor ou senha inválidos' }, { status: 401 })
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
