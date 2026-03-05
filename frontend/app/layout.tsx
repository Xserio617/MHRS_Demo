import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MHRS - Merkezi Hekim Randevu Sistemi',
  description: 'Merkezi Hekim Randevu Sistemi - Hastane, Klinik ve Hekim Randevu Yonetim Sistemi',
}

export const viewport: Viewport = {
  themeColor: '#2db5a3',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
