'use client'

// "Comanda-alvo": quando o garçom escolhe adicionar itens a uma comanda aberta
// (botão + na tela de Comandas), tudo passa a operar travado nessa comanda:
// o carrinho vira um carrinho ESPECÍFICO dela (ver lib/cart.ts) e o checkout
// vem travado. O estado persiste em localStorage — sobrevive a navegar,
// voltar, sair e entrar. Só é zerado ao concluir o envio, ao cancelar no
// banner/checkout, ou ao iniciar do zero em "Anotar pedido".

export type TargetComanda = { comanda: number; nome: string }

const KEY = 'garcom_target_comanda'
export const TARGET_EVENT = 'garcom-target-changed'

function notify() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TARGET_EVENT))
  // O carrinho ativo depende da comanda-alvo (chave por comanda) — avisa também.
  window.dispatchEvent(new CustomEvent('garcom-cart-changed'))
}

export function setTargetComanda(t: TargetComanda) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(t))
  } catch {}
  notify()
}

export function getTargetComanda(): TargetComanda | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TargetComanda) : null
  } catch {
    return null
  }
}

export function clearTargetComanda() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {}
  notify()
}
