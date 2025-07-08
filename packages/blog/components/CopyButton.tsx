'use client';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ target }: { target: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(target);
    setCopied(true);
    setTimeout(() => setCopied(false), 700); // 2초 후에 원래 상태로 복귀
  };

  return (
    <button
      className="text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent rounded-sm p-[6px] transition-all"
      disabled={copied}
      onClick={handleCopy}
    >
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
    </button>
  );
}
