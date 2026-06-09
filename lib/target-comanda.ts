'use client'

// "Comanda-alvo": quando o garçom escolhe adicionar itens a uma comanda aberta
// (na tela de Comandas), guardamos aqui para o checkout já vir pré-preenchido.
// Usa sessionStorage (some ao fechar a aba) — é um handoff de curta duração.

export type TargetComanda = { comanda: number; nome: string }

const KEY = 'garcom_target_comanda'

export function setTargetComanda(t: TargetComanda) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(t))
  } catch {}
}

export function getTargetComanda(): TargetComanda | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TargetComanda) : null
  } catch {
    return null
  }
}

export function clearTargetComanda() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {}
}
