'use client'

import { useEffect, useState } from 'react'
import { Utensils, X } from 'lucide-react'
import { getTargetComanda, clearTargetComanda, TargetComanda } from '@/lib/target-comanda'

/**
 * Faixa fixa que lembra o garçom de que está lançando itens numa comanda já
 * existente (veio de "Adicionar itens"). Some ao cancelar.
 */
export default function TargetBanner() {
  const [target, setTarget] = useState<TargetComanda | null>(null)

  useEffect(() => {
    setTarget(getTargetComanda())
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
        onClick={() => {
          clearTargetComanda()
          setTarget(null)
        }}
        className="grid h-7 w-7 place-items-center rounded-full text-primary-700 hover:bg-primary-100"
        aria-label="Cancelar"
      >
        <X size={16} />
      </button>
    </div>
  )
}
