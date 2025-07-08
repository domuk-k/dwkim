import { allPosts } from '@/.contentlayer/generated';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-16">
          <h1 className="text-4xl font-light text-gray-900 dark:text-white tracking-tight mb-4">
            글
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
            생각과 경험을 정리한 기록들
          </p>
        </header>
        
        <div className="space-y-1">
          {allPosts.map((post, index) => (
            <Link key={post._id} href={post.slug} className="group block">
              <article className="py-6 px-4 -mx-4 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors leading-snug">
                      {post.title}
                    </h2>
                    
                    {post.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-3">
                        {post.description}
                      </p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                      <time>
                        {new Date(post.date).toLocaleDateString('ko-KR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </time>
                    </div>
                  </div>
                  
                  <div className="ml-6 flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                      <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
