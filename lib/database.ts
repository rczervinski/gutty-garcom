import { Pool } from 'pg'
import { getCurrentDbUrl } from './request-context'

function getGlobalUrl() {
  return process.env.DATABASE_URL || ''
}
const url = getGlobalUrl()
const sslModeFromUrl = /[?&]sslmode=([^&]+)/i.exec(url)?.[1]

// Se explicitamente solicitado 'no-verify', desabilitar verificação globalmente
if (sslModeFromUrl === 'no-verify' || process.env.DB_SSL_MODE === 'no-verify') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  console.warn('⚠️ [DATABASE] NODE_TLS_REJECT_UNAUTHORIZED=0 aplicado (no-verify mode)')
}

// Pool por DB URL (multi-tenant).
const pools = new Map<string, Pool>()

function extractSslMode(dbUrl: string | undefined) {
  if (!dbUrl) return undefined
  return /[?&]sslmode=([^&]+)/i.exec(dbUrl)?.[1]
}

/**
 * Detecta configuração SSL para uma dbUrl específica.
 */
export function getSSLForUrl(dbUrl: string): any {
  const sslModeMatch = /[?&]sslmode=([^&]+)/i.exec(dbUrl)
  const sslMode = sslModeMatch?.[1]

  const disableSSL =
    sslMode === 'disable' ||
    dbUrl.includes('cloudclusters.net') ||
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1')

  if (disableSSL) return false

  const needsSSL =
    sslMode === 'require' ||
    sslMode === 'verify-full' ||
    sslMode === 'verify-ca' ||
    dbUrl.includes('rds.amazonaws.com') ||
    dbUrl.includes('neon.tech') ||
    dbUrl.includes('supabase')

  if (needsSSL || sslMode === 'no-verify' || process.env.DB_SSL_MODE === 'no-verify') {
    return { rejectUnauthorized: false }
  }

  return false
}

function getPoolFor(dbUrl?: string): Pool {
  const key = dbUrl || getGlobalUrl()
  let p = pools.get(key)
  if (!p) {
    const sslConfig = key ? getSSLForUrl(key) : false
    const finalSSL = key.includes('cloudclusters.net') ? false : sslConfig

    p = new Pool({
      connectionString: key,
      ssl: finalSSL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    })
    pools.set(key, p)
  }
  return p
}

async function resetPoolWithoutSSL(dbUrl: string) {
  const existing = pools.get(dbUrl)
  if (existing) {
    try { await existing.end() } catch {}
  }
  const p = new Pool({
    connectionString: dbUrl,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  })
  pools.set(dbUrl, p)
  console.warn('⚠️ [DATABASE] Fallback aplicado: reconectando sem SSL para URL atual')
  return p
}

export async function query(text: string, params?: any[], opts?: { dbUrl?: string, _noSSLFallbackTried?: boolean }) {
  const currentUrl = opts?.dbUrl || getCurrentDbUrl() || getGlobalUrl()
  const pool = getPoolFor(currentUrl)
  let client

  try {
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao conectar ao pool após 20s')), 20000)
      )
    ]) as any

    return await client.query(text, params)
  } catch (error: any) {
    const msg = String(error?.message || '')
    const sslMode = extractSslMode(currentUrl)
    const globalSSLMode = process.env.DB_SSL_MODE
    const canFallback =
      msg.includes('server does not support SSL') &&
      !opts?._noSSLFallbackTried &&
      sslMode !== 'require' &&
      sslMode !== 'verify-full' &&
      sslMode !== 'verify-ca' &&
      globalSSLMode !== 'require' &&
      globalSSLMode !== 'verify-full' &&
      globalSSLMode !== 'verify-ca'

    if (canFallback && currentUrl) {
      console.warn('⚠️ [DATABASE] Servidor não suporta SSL. Tentando fallback sem SSL.')
      await resetPoolWithoutSSL(currentUrl)
      return await query(text, params, { dbUrl: currentUrl, _noSSLFallbackTried: true })
    }

    throw new Error(`Database error: ${error.message} (${error.code || 'NO_CODE'})`)
  } finally {
    if (client) client.release()
  }
}

export async function getDbConnection(opts?: { dbUrl?: string }) {
  const currentUrl = opts?.dbUrl || getCurrentDbUrl() || getGlobalUrl()
  const pool = getPoolFor(currentUrl)
  return await pool.connect()
}

export async function transaction(callback: (client: any) => Promise<any>, opts?: { dbUrl?: string }) {
  const currentUrl = opts?.dbUrl || getCurrentDbUrl() || getGlobalUrl()
  const pool = getPoolFor(currentUrl)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ [DATABASE] Erro na transação:', error)
    throw error
  } finally {
    client.release()
  }
}

export { getPoolFor }
