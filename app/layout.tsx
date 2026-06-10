import type { Metadata, Viewport } from 'next'
import { Inter, Fustat } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const fustat = Fustat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-fustat',
})

export const metadata: Metadata = {
  title: 'Gutty Pedidos',
  description: 'Anotação de pedidos — Gutty',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ea580c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fustat.variable}`}>
      <body className={inter.className}>
        {/* Largura total: cada tela gerencia seu próprio container (universal:
            celular, tablet, totem e PC). */}
        <div className="min-h-screen bg-slate-50">{children}</div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
