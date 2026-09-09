/**
 * Cor de destaque do modo delivery. O padrão é o LARANJA do Gutty Pedidos
 * (primary-600); se o cardápio da loja trouxer `cor_tema`, ela manda — é a
 * identidade que o cliente daquele restaurante já usa no app dele.
 */
export const COR_PADRAO = '#ea580c'

export function brl(v: any): string {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'
}

export function emPromo(p: { preco: number; preco_promocional?: number | null }): boolean {
  return p.preco_promocional != null && p.preco_promocional > 0 && p.preco_promocional < p.preco
}

export function efetivo(p: { preco: number; preco_promocional?: number | null }): number {
  return emPromo(p) ? (p.preco_promocional as number) : p.preco
}
