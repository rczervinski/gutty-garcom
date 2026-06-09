'use client'

// Helper de fetch para o front. Cookies (AUTH_TOKEN/GARCOM_VENDEDOR) viajam
// automaticamente por serem same-origin httpOnly.

async function handle(res: Response) {
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* sem corpo */
  }
  if (!res.ok || (json && json.success === false) || (json && json.ok === false)) {
    const err = json?.error || json?.message || `Erro ${res.status}`
    throw new Error(typeof err === 'string' ? err : 'Erro na requisição')
  }
  return json
}

export async function apiGet(path: string) {
  const res = await fetch(path, { method: 'GET', credentials: 'include', cache: 'no-store' })
  return handle(res)
}

export async function apiPost(path: string, body?: any) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  return handle(res)
}

export async function apiPut(path: string, body?: any) {
  const res = await fetch(path, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  return handle(res)
}

export function brl(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
