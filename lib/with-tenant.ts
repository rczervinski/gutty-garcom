import { NextRequest, NextResponse } from 'next/server'
import { initTenantForRequest, runWithContext } from './request-context'
import { isTenantsConfigured } from './tenants'

/**
 * Wrapper para route handlers que inicializa o contexto do tenant
 * a partir do JWT do cookie AUTH_TOKEN (ou query/header).
 *
 * Uso:
 * export const GET = withTenant(async (req) => {
 *   const data = await query('SELECT * FROM produtos')
 *   return NextResponse.json({ data })
 * })
 */
export function withTenant(
  handler: (req: NextRequest, params?: any) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, context: any = {}) => {
    const ctx = await initTenantForRequest(req)

    if (!ctx.tenantId || !ctx.dbUrl) {
      const configured = await isTenantsConfigured()
      if (!configured) {
        return NextResponse.json(
          { success: false, error: 'tenants_not_configured' },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'tenant_not_found' },
        { status: 401 }
      )
    }

    const params = context?.params
      ? (context.params instanceof Promise ? await context.params : context.params)
      : undefined

    return runWithContext(ctx, () => handler(req, params))
  }
}
