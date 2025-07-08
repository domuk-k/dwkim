import { FC } from 'react'
import Link from 'next/link'

const HomePage: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to My Blog</h1>
      <p className="text-lg text-gray-600 mb-8">
        This is a personal blog built with Next.js, TypeScript, and Tailwind CSS.
      </p>
      
      <div className="space-y-4">
        <Link 
          href="/blog" 
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          블로그 보기 →
        </Link>
      </div>
    </div>
  )
}

export default HomePage