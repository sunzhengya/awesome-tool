import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Awesome Tool - 实用工具集合',
  description: '一个集合了各种实用工具的Web应用',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="zh">
      <head>
        <script async src="https://docs.opencv.org/4.9.0/opencv.js" type="text/javascript"></script>
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
} 