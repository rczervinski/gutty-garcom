import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from './lib/auth'
import { GARCOM_COOKIE_NAME } from './lib/garcom-auth'

// Rotas públicas (sem login de empresa).
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
]

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/public')) return true
  return false
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function withSecurity(res: NextResponse) {
  Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

function isApi(pathname: string) {
  return pathname.startsWith('/api/')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    // Se já logado na empresa, não fica preso na tela de login.
    if (pathname === '/login') {
      const token = req.cookies.get(COOKIE_NAME)?.value
      if (token && (await verifyToken(token))) {
        const url = req.nextUrl.clone()
        url.pathname = '/garcom'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
    return withSecurity(NextResponse.next())
  }

  // ----- 1ª camada: login de empresa (AUTH_TOKEN) -----
  const token = req.cookies.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    if (isApi(pathname)) {
      return withSecurity(NextResponse.json({ success: false, error: 'nao_autenticado' }, { status: 401 }))
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // ----- 2ª camada: login de vendedor (GARCOM_VENDEDOR) -----
  // Páginas /garcom/* (exceto /garcom/login) exigem o vendedor logado.
  // (As rotas /api/garcom/* validam o vendedor internamente via withGarcom.)
  const isVendedorLoginArea =
    pathname === '/garcom/login' ||
    pathname.startsWith('/api/garcom/vendedor/login') ||
    pathname.startsWith('/api/garcom/vendedor/logout')

  if (pathname.startsWith('/garcom') && !pathname.startsWith('/api') && !isVendedorLoginArea) {
    const garcomCookie = req.cookies.get(GARCOM_COOKIE_NAME)?.value
    if (!garcomCookie) {
      const url = req.nextUrl.clone()
      url.pathname = '/garcom/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  const res = NextResponse.next()
  res.headers.set('x-tenant-id', payload.tid)
  res.headers.set('x-tenant-cnpj', payload.cnpj || '')
  return withSecurity(res)
}

export const config = {
  matcher: ['/((?!_next|favicon|public).*)'],
}
