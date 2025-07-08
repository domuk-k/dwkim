import { CardMdx } from '@/components/CardMdx';
import LightTabs from '@/components/LightTabs';
import { TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';

export default async function Page() {
  return (
    <article className="prose dark:prose-invert">
      <h1 className="!mb-[1rem]">김동욱</h1>
      <div className="mb-8">
        <Link href="/posts" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm font-medium">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          글 보기
        </Link>
      </div>
      <LightTabs>
        <TabsContent value="software-dev">
          <CardMdx slug="software-dev" />
        </TabsContent>
        <TabsContent value="marathon">
          <CardMdx slug="marathon" />
        </TabsContent>
        <TabsContent value="oss">
          <CardMdx slug="oss" />
        </TabsContent>
        <TabsContent value="coach">
          <CardMdx slug="coach" />
        </TabsContent>
        <TabsContent value="optimistic">
          낙관적임 어필하려고 준비중 😉
        </TabsContent>
      </LightTabs>
    </article>
  );
}
