'use client'

// Carrinho do garçom — espelha o CartManager do app Android (estado local persistido).
// Guardado em localStorage; dispara 'garcom-cart-changed' a cada mudança.

export type CartItem = {
  codigoGtin: string
  descricao: string
  precoVenda: number
  quantidade: number
  obs?: string // observação POR ITEM (ex.: "sem cebola")
}

const KEY = 'garcom_cart'
const EVENT = 'garcom-cart-changed'

function read(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(items: CartItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function getCart(): CartItem[] {
  return read()
}

export function addItem(product: { codigoGtin: string; descricao: string; precoVenda: number }, quantidade = 1) {
  const items = read()
  const existing = items.find((i) => i.codigoGtin === product.codigoGtin)
  if (existing) {
    existing.quantidade += quantidade
  } else {
    items.push({ ...product, quantidade })
  }
  write(items)
}

export function setQuantity(codigoGtin: string, quantidade: number) {
  let items = read()
  if (quantidade <= 0) {
    items = items.filter((i) => i.codigoGtin !== codigoGtin)
  } else {
    const it = items.find((i) => i.codigoGtin === codigoGtin)
    if (it) it.quantidade = quantidade
  }
  write(items)
}

export function setObs(codigoGtin: string, obs: string) {
  const items = read()
  const it = items.find((i) => i.codigoGtin === codigoGtin)
  if (it) {
    it.obs = obs
    write(items)
  }
}

export function removeItem(codigoGtin: string) {
  write(read().filter((i) => i.codigoGtin !== codigoGtin))
}

export function clearCart() {
  write([])
}

export function cartCount(): number {
  return read().reduce((s, i) => s + i.quantidade, 0)
}

export function cartTotal(): number {
  return read().reduce((s, i) => s + i.precoVenda * i.quantidade, 0)
}

export const CART_EVENT = EVENT
