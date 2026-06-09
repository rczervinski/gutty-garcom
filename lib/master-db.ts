import { Pool } from 'pg'
import { getSSLForUrl } from './database'

let pool: Pool | null = null

function getPool(): Pool {
  if (pool) return pool

  const url = process.env.MASTER_DATABASE_URL
  if (!url) {
    throw new Error('[master-db] MASTER_DATABASE_URL nao configurada')
  }

  const sslConfig = getSSLForUrl(url)
  const finalSSL = url.includes('cloudclusters.net') ? false : sslConfig

  pool = new Pool({
    connectionString: url,
    ssl: finalSSL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  })

  pool.on('error', (err) => {
    console.error('[master-db] Erro inesperado no pool:', err.message)
  })

  return pool
}

export async function masterQuery(text: string, params?: any[]) {
  const p = getPool()
  const client = await p.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

export function isMasterConfigured(): boolean {
  return !!process.env.MASTER_DATABASE_URL
}
