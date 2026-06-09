// Registro de tenants com suporte a banco de dados (clientes_web) e fallback para TENANTS_JSON.
// Prioridade: MASTER_DATABASE_URL (DB) > TENANTS_JSON (env/legado).
// Espelha lib/tenants.ts do app `caixa` — mantenha em sincronia.

export type TenantRecord = {
  id: string
  nome: string
  senha: string
  dbUrl: string
  cnpj: string
  telefone?: string
  provider?: string
}

const cache = new Map<string, TenantRecord>()
let cacheByNome = new Map<string, TenantRecord>()
let lastRefreshed = 0
const CACHE_TTL_MS = () => (Number(process.env.TENANT_CACHE_TTL) || 300) * 1000

function isCacheStale(): boolean {
  return Date.now() - lastRefreshed > CACHE_TTL_MS()
}

let legacyCached: TenantRecord[] | null = null

function loadFromEnv(): TenantRecord[] {
  if (legacyCached) return legacyCached
  try {
    const raw = process.env.TENANTS_JSON
    if (!raw) return (legacyCached = [])
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return (legacyCached = [])
    legacyCached = parsed.filter((t: any) => t && t.id && t.nome && t.senha && t.dbUrl && t.cnpj)
    return legacyCached
  } catch (e) {
    console.error('[tenants] erro ao ler TENANTS_JSON:', (e as any)?.message)
    legacyCached = []
    return legacyCached
  }
}

function isUsingDb(): boolean {
  return !!process.env.MASTER_DATABASE_URL
}

let refreshPromise: Promise<void> | null = null

async function refreshCacheFromDb(): Promise<void> {
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') return
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const { masterQuery } = await import('./master-db')
      const { decryptDbUrl } = await import('./crypto')

      const result = await masterQuery(
        `SELECT id, nome, db_url_enc, cnpj, telefone, provider
         FROM clientes_web
         WHERE ativo = true`
      )

      const newCache = new Map<string, TenantRecord>()
      const newByNome = new Map<string, TenantRecord>()

      for (const row of result.rows) {
        let dbUrl: string
        try {
          dbUrl = decryptDbUrl(row.db_url_enc)
        } catch (err: any) {
          console.error(`[tenants] Erro ao decriptar dbUrl do tenant ${row.id}:`, err.message)
          continue
        }

        const record: TenantRecord = {
          id: row.id,
          nome: row.nome,
          senha: '',
          dbUrl,
          cnpj: row.cnpj,
          telefone: row.telefone || undefined,
          provider: row.provider || undefined,
        }

        newCache.set(record.id, record)
        newByNome.set(record.nome, record)
      }

      cache.clear()
      newCache.forEach((v, k) => cache.set(k, v))
      cacheByNome = newByNome
      lastRefreshed = Date.now()

      console.log(`[tenants] Cache atualizado: ${cache.size} tenants do banco`)
    } catch (err: any) {
      if (cache.size > 0) {
        console.warn(`[tenants] Falha ao atualizar cache, mantendo stale (${cache.size} tenants):`, err.message)
      } else {
        console.error('[tenants] Falha ao carregar tenants do banco e cache vazio:', err.message)
      }
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function ensureCache(): Promise<void> {
  if (!isUsingDb()) return
  if (cache.size === 0 || isCacheStale()) {
    await refreshCacheFromDb()
  }
}

export async function loadTenants(): Promise<TenantRecord[]> {
  if (!isUsingDb()) return loadFromEnv()
  await ensureCache()
  return Array.from(cache.values())
}

export async function findTenantByLogin(nome: string, senha: string): Promise<TenantRecord | null> {
  if (!isUsingDb()) {
    const list = loadFromEnv()
    return list.find((x) => String(x.nome) === String(nome) && String(x.senha) === String(senha)) || null
  }

  try {
    const { masterQuery } = await import('./master-db')
    const { decryptDbUrl } = await import('./crypto')
    const bcrypt = await import('bcryptjs')

    const result = await masterQuery(
      `SELECT id, nome, senha_hash, db_url_enc, cnpj, telefone, provider
       FROM clientes_web
       WHERE nome = $1 AND ativo = true`,
      [String(nome)]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    const match = await bcrypt.compare(String(senha), row.senha_hash)
    if (!match) return null

    let dbUrl: string
    try {
      dbUrl = decryptDbUrl(row.db_url_enc)
    } catch {
      console.error(`[tenants] Erro ao decriptar dbUrl para login de ${nome}`)
      return null
    }

    return {
      id: row.id,
      nome: row.nome,
      senha: '',
      dbUrl,
      cnpj: row.cnpj,
      telefone: row.telefone || undefined,
      provider: row.provider || undefined,
    }
  } catch (err: any) {
    console.error('[tenants] Erro no findTenantByLogin:', err.message)
    return null
  }
}

export async function getTenantById(id: string): Promise<TenantRecord | null> {
  if (!isUsingDb()) {
    const list = loadFromEnv()
    return list.find((x) => String(x.id) === String(id)) || null
  }
  await ensureCache()
  return cache.get(String(id)) || null
}

export async function isTenantsConfigured(): Promise<boolean> {
  if (isUsingDb()) {
    await ensureCache()
    return cache.size > 0
  }
  try {
    const raw = process.env.TENANTS_JSON
    if (!raw) return false
    const list = loadFromEnv()
    return Array.isArray(list) && list.length > 0
  } catch {
    return false
  }
}

export function getTenantByIdSync(id: string): TenantRecord | null {
  if (!isUsingDb()) {
    const list = loadFromEnv()
    return list.find((x) => String(x.id) === String(id)) || null
  }
  return cache.get(String(id)) || null
}

export async function invalidateCache(): Promise<void> {
  lastRefreshed = 0
  if (isUsingDb()) {
    await refreshCacheFromDb()
  }
}

// Startup: aquecer cache se DB configurado (somente Node.js runtime, nunca Edge)
const isEdgeRuntime = typeof (globalThis as any).EdgeRuntime !== 'undefined'

if (!isEdgeRuntime && !!process.env.MASTER_DATABASE_URL) {
  refreshCacheFromDb().catch((err) => {
    console.error('[tenants] Falha no aquecimento inicial do cache:', err.message)
  })

  const intervalMs = CACHE_TTL_MS()
  if (intervalMs > 0) {
    setInterval(() => {
      refreshCacheFromDb().catch((err) => {
        console.warn('[tenants] Falha no refresh periodico:', err.message)
      })
    }, intervalMs)
  }
}
