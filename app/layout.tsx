import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// 1. Pastikan kamu mengimpor file Providers yang sudah kamu buat tadi
import { Providers } from './Providers' 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kanban Board',
  description: 'Task Management App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Bungkus {children} dengan tag <Providers> */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}