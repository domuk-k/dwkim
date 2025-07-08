import React from 'react'
import { ExternalLink } from './external-link'

// 서버 컴포넌트 - 정적 푸터 콘텐츠
export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <ExternalLink 
              href="https://github.com/dwkim"
              className="font-medium underline underline-offset-4"
            >
              DW Kim
            </ExternalLink>
            . The source code is available on{" "}
            <ExternalLink 
              href="https://github.com/dwkim/blog"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </ExternalLink>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}