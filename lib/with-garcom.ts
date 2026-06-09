import { NextRequest, NextResponse } from 'next/server'
import { withTenant } from './with-tenant'
import { readGarcomFromRequest, GarcomPayload } from './garcom-auth'

/**
 * Wrapper para rotas que exigem empresa (tenant) E vendedor logado.
 * Injeta o contexto do tenant (withTenant) e o vendedor autenticado.
 *
 * Uso:
 * export const POST = withGarcom(async (req, { vendedor }) => { ... })
 */
export function withGarcom(
  handler: (req: NextRequest, ctx: { vendedor: GarcomPayload }, params?: any) => Promise<NextResponse> | NextResponse
) {
  return withTenant(async (req: NextRequest, params?: any) => {
    const vendedor = await readGarcomFromRequest(req)
    if (!vendedor) {
      return NextResponse.json({ success: false, error: 'vendedor_nao_autenticado' }, { status: 401 })
    }
    return handler(req, { vendedor }, params)
  })
}
