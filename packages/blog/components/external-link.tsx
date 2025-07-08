import type { ReactNode } from 'react';

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} relative group cursor-alias`}
      title="외부 링크로 이동합니다"
    >
      {children}
    </a>
  );
}
