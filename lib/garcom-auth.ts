import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

// Cookie da sessão do vendedor/garçom (2ª camada, depois do login de empresa).
export const GARCOM_COOKIE_NAME = 'GARCOM_VENDEDOR'

const SECRET = process.env.GARCOM_JWT_SECRET || process.env.AUTH_JWT_SECRET
if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('GARCOM_JWT_SECRET ou AUTH_JWT_SECRET precisa ter >= 32 chars em producao')
  }
  console.warn('[garcom-auth] segredo ausente/curto. Usando fallback de desenvolvimento.')
}

const KEY = new TextEncoder().encode(SECRET || 'dev-only-insecure-secret-32chars')

export type GarcomPayload = {
  tid: string       // tenant (empresa) — casa com o AUTH_TOKEN
  codigo: number    // vendedores.codigo
  nome: string      // vendedores.nome
}

export async function signGarcomToken(payload: GarcomPayload, expiresInSeconds = 60 * 60 * 12) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(KEY)
}

export async function verifyGarcomToken(token: string): Promise<GarcomPayload | null> {
  try {
    const { payload } = await jwtVerify(token, KEY)
    return payload as any
  } catch {
    return null
  }
}

export function attachGarcomCookie(res: NextResponse, token: string) {
  const isSecure = process.env.FORCE_SECURE_COOKIE === 'true'
  res.cookies.set({
    name: GARCOM_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export function clearGarcomCookie(res: NextResponse) {
  res.cookies.set({ name: GARCOM_COOKIE_NAME, value: '', path: '/', maxAge: 0 })
}

export async function readGarcomFromRequest(req: NextRequest): Promise<GarcomPayload | null> {
  const token = req.cookies.get(GARCOM_COOKIE_NAME)?.value
  if (!token) return null
  return await verifyGarcomToken(token)
}
