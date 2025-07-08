import { allPosts } from '@/.contentlayer/generated';

export interface PostProps {
  params: {
    slug: string[];
  };
}

export async function getPostFromParams(params: PostProps['params']) {
  const slug = params?.slug?.join('/');
  const post = allPosts.find((post) => post.slugAsParams === slug);

  if (!post) {
    null;
  }

  return post;
}
