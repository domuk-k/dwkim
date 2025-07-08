import { allCards } from '@/.contentlayer/generated';
import { Mdx } from '@/components/mdx-components';

export function CardMdx({ slug }: { slug: string }) {
  const card = allCards.find((card) => card._raw.sourceFileName.includes(slug));

  if (!card) return null;

  return (
    <>
      <Mdx code={card.body.code} />
    </>
  );
}
