import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ProvidersSimple } from '@/components/providers-simple'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nomad Arc - AI‑Driven Cross‑Chain Intent Commander',
  description: 'An AI‑agent‑based cross‑chain DeFi platform where users can execute complex multi‑chain asset operations via natural‑language instructions.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body className={`${inter.className} antialiased bg-tech-dark text-white`}>
        <ProvidersSimple>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </ProvidersSimple>
      </body>
    </html>
  )
}