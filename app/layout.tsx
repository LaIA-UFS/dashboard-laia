import type { Metadata } from 'next'
import { MuseoModerno } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'


const museo = MuseoModerno({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LaIA - Mapeamento de Membros',
  description: 'Painel de mapeamento de perfis da Liga Acadêmica de Inteligencia Artificial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body className={`${museo.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
