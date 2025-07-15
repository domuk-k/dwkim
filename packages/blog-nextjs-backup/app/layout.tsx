import './globals.css';
import { Analytics } from '@/components/analytics';
import Footer from '@/components/footer';
import { Navigation } from '@/components/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';

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
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-white dark:bg-[var(--background)] text-slate-900 dark:text-slate-50 font-pretendard"
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navigation />
          <div className="max-w-2xl mx-auto flex flex-col pt-24 pb-10 px-4">
            <main>{children}</main>
            <Footer />
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
