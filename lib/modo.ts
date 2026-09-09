'use client'

/**
 * Modo de trabalho do garçom, lembrado neste aparelho.
 *
 * - `tradicional` — o app de comandas de sempre (`/garcom`).
 * - `delivery` — cardápio com fotos e complementos do Gutty Delivery (`/balcao`).
 *
 * Fica no `localStorage` porque é escolha do APARELHO, não da conta: o tablet do
 * balcão pode viver no modo delivery enquanto os celulares seguem no tradicional.
 * Só a primeira entrada pergunta; depois vai direto.
 */

export type Modo = 'tradicional' | 'delivery'

const CHAVE = 'garcom_modo'

export function lerModo(): Modo | null {
  if (typeof window === 'undefined') return null
  try {
    const m = window.localStorage.getItem(CHAVE)
    return m === 'tradicional' || m === 'delivery' ? m : null
  } catch {
    return null
  }
}

export function salvarModo(m: Modo): void {
  try { window.localStorage.setItem(CHAVE, m) } catch {}
}

export function limparModo(): void {
  try { window.localStorage.removeItem(CHAVE) } catch {}
}

/** Pra onde ir depois do login, respeitando a escolha anterior. */
export function rotaDoModo(m: Modo | null): string {
  if (m === 'delivery') return '/balcao'
  if (m === 'tradicional') return '/garcom'
  return '/garcom/modo'
}
