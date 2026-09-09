'use client'

import type { ApiPedido } from './tipos'

/**
 * Ponte com a retaguarda pelo proxy same-origin `/api/balcao/**`.
 *
 * Mesma credencial do resto do app: cookie httpOnly, `credentials: 'include'`,
 * sem token no navegador.
 *
 * Por que não usar `apiGet/apiPost` direto: eles LANÇAM erro e jogam fora o
 * corpo da resposta. O 409 de mesa × comanda (§10) traz `codigo` e `sugestao` —
 * é o que desenha o botão "Abrir comanda 3" no formulário. Aqui a resposta chega
 * inteira e cada tela decide o que fazer com ela.
 */

async function ler(res: Response): Promise<any> {
  try {
    const json = await res.json()
    if (json && typeof json === 'object') return json
  } catch {
    /* resposta sem corpo JSON (404 do Next, gateway, etc.) */
  }
  return { success: false, error: `Erro ${res.status}` }
}

export const apiBalcao: ApiPedido = {
  get: async (caminho: string) => {
    try {
      const res = await fetch(`/api/balcao${caminho}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      return await ler(res)
    } catch {
      return { success: false, error: 'Sem conexão — tente de novo' }
    }
  },
  post: async (caminho: string, corpo: any) => {
    try {
      const res = await fetch(`/api/balcao${caminho}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo ?? {}),
      })
      return await ler(res)
    } catch {
      return { success: false, error: 'Sem conexão — tente de novo' }
    }
  },
}
