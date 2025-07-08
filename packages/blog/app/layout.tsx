import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Footer } from '@/components/footer'
import { Analytics } from '@/components/analytics'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'DW Kim Blog',
    template: '%s | DW Kim Blog',
  },
  description: 'Personal blog by DW Kim - Software development, thoughts, and experiences',
  keywords: ['blog', 'software development', 'programming', 'technology'],
  authors: [{ name: 'DW Kim' }],
  creator: 'DW Kim',
  metadataBase: new URL('https://dwkim.dev'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://dwkim.dev',
    siteName: 'DW Kim Blog',
    title: 'DW Kim Blog',
    description: 'Personal blog by DW Kim - Software development, thoughts, and experiences',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DW Kim Blog',
    description: 'Personal blog by DW Kim - Software development, thoughts, and experiences',
    creator: '@dwkim_dev',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// Server Component (기본값) - 서버에서 렌더링되는 루트 레이아웃
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        {/* ThemeProvider는 클라이언트 컴포넌트 */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            {/* Footer는 서버 컴포넌트 */}
            <Footer />
          </div>
        </ThemeProvider>
        {/* Analytics는 클라이언트 컴포넌트 */}
        <Analytics />
      </body>
    </html>
  )
}