import { defineDocumentType, makeSource } from 'contentlayer/source-files';

import { runBashCommand } from './lib/runBash';

/** @type {import('contentlayer/source-files').ComputedFields} */
const computedFields = {
  slug: {
    type: 'string',
    resolve: (doc) => `/${doc._raw.flattenedPath}`,
  },
  slugAsParams: {
    type: 'string',
    resolve: (doc) => doc._raw.flattenedPath.split('/').slice(1).join('/'),
  },
};

export const Post = defineDocumentType(() => ({
  name: 'Post',
  filePathPattern: 'posts/**/*.{md,mdx}',
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
    },
    date: {
      type: 'date',
      required: true,
    },
  },
  computedFields,
}));

export const Card = defineDocumentType(() => ({
  name: 'Card',
  filePathPattern: 'cards/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
    },
  },
}));

export const Book = defineDocumentType(() => ({
  name: 'Book',
  filePathPattern: 'books/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      required: true,
    },
    isbn: {
      type: 'number',
      required: true,
    },
    author: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
    },
  },
}));

export const Quote = defineDocumentType(() => ({
  name: 'Quote',
  filePathPattern: 'quotes/**/*.mdx',
  contentType: 'mdx',
  fields: {
    quote: {
      type: 'string',
      required: true,
    },
    author: {
      type: 'string',
      required: true,
    },
    source: {
      type: 'string',
    },
  },
}));

const syncContentFromGit = (subDir) => async (contentDir) => {
  const syncContent = async () => {
    const repoName = 'domuk-k/dwkim-vault';

    try {
      await runBashCommand(`
        if [ -d "${contentDir}/posts" ]; then
          rm -rf "${contentDir}/posts"
        fi
        gh repo clone ${repoName} ./${contentDir}/${subDir}
      `);
    } catch (error) {
      throw new Error(`Git sync failed: ${error.message}`);
    }
  };

  let isActive = true;
  let timer;

  const startSync = async () => {
    await syncContent();

    if (isActive) {
      timer = setTimeout(startSync, 1000 * 60 * 5);
    }
  };

  await startSync();

  return () => {
    isActive = false;
    clearTimeout(timer);
  };
};

export default makeSource({
  contentDirPath: './content',
  documentTypes: [Post, Card, Book, Quote],
  syncFiles: syncContentFromGit('posts'),
});
