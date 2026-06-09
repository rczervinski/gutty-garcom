// Teto absoluto: mesmo passando captcha, ninguem faz mais que isso em 15min.
const MAX_ATTEMPTS = 30
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

// A partir desta quantidade de falhas, o front pode exigir captcha.
export const ATTEMPTS_BEFORE_CAPTCHA = 3

const attempts = new Map<string, number[]>()

function cleanOld(ip: string): number[] {
  const now = Date.now()
  const list = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (list.length === 0) {
    attempts.delete(ip)
    return []
  }
  attempts.set(ip, list)
  return list
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const list = cleanOld(ip)
  if (list.length >= MAX_ATTEMPTS) {
    const oldest = list[0]
    const retryAfter = Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000)
    return { allowed: false, retryAfter }
  }
  return { allowed: true }
}

/** Quantas falhas validas dentro da janela atual. Nao muta o store. */
export function getAttemptCount(ip: string): number {
  return cleanOld(ip).length
}

export function recordFailedAttempt(ip: string): void {
  const list = cleanOld(ip)
  list.push(Date.now())
  attempts.set(ip, list)
}

export function resetAttempts(ip: string): void {
  attempts.delete(ip)
}

export function getClientIp(req: Request): string {
  const h = req.headers
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = h.get('x-real-ip')
  if (xri) return xri.trim()
  return 'unknown'
}

// Limpeza periodica de entradas expiradas
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(attempts.entries())
  for (const [ip, list] of entries) {
    const valid = list.filter((ts: number) => now - ts < WINDOW_MS)
    if (valid.length === 0) {
      attempts.delete(ip)
    } else {
      attempts.set(ip, valid)
    }
  }
}, CLEANUP_INTERVAL_MS)
