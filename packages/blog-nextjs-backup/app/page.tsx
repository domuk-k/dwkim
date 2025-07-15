import { CardMdx } from '@/components/CardMdx';
import LightTabs from '@/components/LightTabs';
import { TabsContent } from '@/components/ui/tabs';

export default async function Page() {
  return (
    <article className="prose dark:prose-invert">
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
