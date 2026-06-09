'use client'

import { useEffect, useState } from 'react'
import { Utensils, X } from 'lucide-react'
import { getTargetComanda, clearTargetComanda, TargetComanda, TARGET_EVENT } from '@/lib/target-comanda'

/**
 * Faixa fixa que lembra o garçom de que está lançando itens numa comanda já
 * existente (veio do + em Comandas abertas). O estado persiste ao navegar/voltar;
 * o X solta a comanda (o carrinho dela fica guardado na chave própria).
 */
export default function TargetBanner() {
  const [target, setTarget] = useState<TargetComanda | null>(null)

  useEffect(() => {
    const sync = () => setTarget(getTargetComanda())
    sync()
    window.addEventListener(TARGET_EVENT, sync)
    return () => window.removeEventListener(TARGET_EVENT, sync)
  }, [])

  if (!target) return null

  return (
    <div className="flex items-center gap-2 border-b border-primary-100 bg-primary-50 px-4 py-2 text-sm text-primary-800">
      <Utensils size={16} />
      <span className="flex-1 truncate">
        Lançando na comanda <b>{target.comanda}</b>
        {target.nome ? <> · {target.nome}</> : null}
      </span>
      <button
        onClick={() => clearTargetComanda()}
        className="grid h-7 w-7 place-items-center rounded-full text-primary-700 hover:bg-primary-100"
        aria-label="Soltar comanda"
      >
        <X size={16} />
      </button>
    </div>
  )
}
