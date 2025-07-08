// contentlayer.config.js
import { defineDocumentType, makeSource } from "contentlayer2/source-files";
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.md`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the post",
      required: true
    },
    date: {
      type: "date",
      description: "The date of the post",
      required: true
    },
    summary: {
      type: "string",
      description: "Summary of the post",
      required: false
    },
    tags: {
      type: "list",
      of: { type: "string" },
      description: "Tags for the post",
      required: false
    }
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (doc) => `/posts/${doc._raw.flattenedPath.replace("posts/", "")}`
    },
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("posts/", "")
    }
  }
}));
var Book = defineDocumentType(() => ({
  name: "Book",
  filePathPattern: `books/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the book",
      required: true
    },
    author: {
      type: "string",
      description: "The author of the book",
      required: true
    },
    rating: {
      type: "number",
      description: "Rating out of 5",
      required: false
    },
    tags: {
      type: "list",
      of: { type: "string" },
      description: "Tags for the book",
      required: false
    }
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (doc) => `/books/${doc._raw.flattenedPath.replace("books/", "")}`
    },
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("books/", "")
    }
  }
}));
var Card = defineDocumentType(() => ({
  name: "Card",
  filePathPattern: `cards/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the card",
      required: true
    },
    description: {
      type: "string",
      description: "Description of the card",
      required: false
    },
    icon: {
      type: "string",
      description: "Icon name for the card",
      required: false
    }
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (doc) => `/cards/${doc._raw.flattenedPath.replace("cards/", "")}`
    },
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("cards/", "")
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./content",
  documentTypes: [Post, Book, Card],
  mdx: {
    remarkPlugins: [],
    rehypePlugins: []
  }
});
export {
  Book,
  Card,
  Post,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-NO3P2GSR.mjs.map
