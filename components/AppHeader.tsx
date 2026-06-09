'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function AppHeader({
  title,
  back,
  right,
}: {
  title: string
  back?: boolean | string
  right?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm">
      {back ? (
        <button
          onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="h-9 w-9" />
      )}
      <h1 className="flex-1 truncate text-base font-semibold text-slate-900">{title}</h1>
      {right}
    </header>
  )
}
