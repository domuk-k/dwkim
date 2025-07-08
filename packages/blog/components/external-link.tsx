import React from 'react'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

// 서버 컴포넌트 - 외부 링크 렌더링
export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <ExternalLinkIcon className="ml-1 inline h-3 w-3" />
    </a>
  )
}