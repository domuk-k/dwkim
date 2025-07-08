import './globals.css';
import { Analytics } from '@/components/analytics';
import Footer from '@/components/footer';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '김동욱',
  description: '김동욱의 블로그',
  authors: [{ name: '김동욱', url: 'https://github.com/domuk-k' }],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`antialiased min-h-screen bg-white dark:bg-[var(--background)] text-slate-900 dark:text-slate-50 ${inter.className}`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="max-w-2xl mx-auto flex flex-col py-10 px-4">
            <main>{children}</main>
            <Footer />
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
