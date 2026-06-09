import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantById, TenantRecord } from './tenants'

// Nome PRÓPRIO do cookie de empresa do garçom. NÃO reutiliza 'AUTH_TOKEN' do
// caixa de propósito: em dev os dois apps compartilham o host `localhost`
// (cookies ignoram a porta), então um nome igual faria o garçom "herdar" a
// sessão de empresa do caixa e pular o login. Nomes distintos = sessões isoladas.
export const COOKIE_NAME = 'GARCOM_AUTH'

// AUTH_JWT_SECRET DEVE ser definido via env em produção (compartilhado com o caixa).
const JWT_SECRET = process.env.AUTH_JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: AUTH_JWT_SECRET must be set and at least 32 characters in production!')
  }
  console.warn('⚠️ WARNING: AUTH_JWT_SECRET not set or too short. Using insecure default for development only!')
}
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET || 'dev-only-insecure-secret-32chars')

export type TokenPayload = {
  tid: string
  cnpj: string
  nome: string
}

export async function signToken(payload: TokenPayload, expiresInSeconds = 60 * 60 * 12) {
  const jwt = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(SECRET_KEY)
  return jwt
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as any
  } catch (err) {
    console.error('[AUTH] verifyToken failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

export function attachAuthCookie(res: NextResponse, token: string) {
  const isSecure = process.env.FORCE_SECURE_COOKIE === 'true'
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 60 * 60 * 12, // 12 horas
  })
}

export function clearAuthOnResponse(res: NextResponse) {
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 })
}

export async function readAuthFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return await verifyToken(token)
}

export async function getCurrentTenantFromRequest(req: NextRequest): Promise<TenantRecord | null> {
  const payload = await readAuthFromRequest(req)
  if (!payload) return null
  return await getTenantById(payload.tid)
}
