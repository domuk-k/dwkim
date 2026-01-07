import path from 'node:path'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import playformInline from '@playform/inline'
import { defineConfig } from 'astro/config'
import mermaid from 'astro-mermaid'
import rehypeKatex from 'rehype-katex'
import remarkDirective from 'remark-directive'
import remarkMath from 'remark-math'
import { themeConfig } from './src/config'
import rehypeCleanup from './src/plugins/rehype-cleanup.mjs'
import rehypeCopyCode from './src/plugins/rehype-copy-code.mjs'
import rehypeImageProcessor from './src/plugins/rehype-image-processor.mjs'
import remarkEmbeddedMedia from './src/plugins/remark-embedded-media.mjs'
import remarkObsidianCallouts from './src/plugins/remark-obsidian-callouts.mjs'
import remarkReadingTime from './src/plugins/remark-reading-time.mjs'
import remarkTOC from './src/plugins/remark-toc.mjs'
import { imageConfig } from './src/utils/image-config'

export default defineConfig({
  site: themeConfig.site.website,
  devToolbar: {
    enabled: false
  },
  output: 'static',
  build: {
    inlineStylesheets: 'auto'
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: imageConfig
    }
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'one-light',
        dark: 'one-dark-pro'
      },
      defaultColor: false,
      wrap: false
    },
    remarkPlugins: [
      remarkObsidianCallouts,
      remarkMath,
      remarkDirective,
      remarkEmbeddedMedia,
      remarkReadingTime,
      remarkTOC
    ],
    rehypePlugins: [rehypeKatex, rehypeCleanup, rehypeImageProcessor, rehypeCopyCode]
  },
  integrations: [
    mermaid(),
    mdx(),
    sitemap(),
    playformInline({
      Exclude: [
        (file: string) => {
          const fileName = file.toLowerCase()
          return fileName.includes('katex') || fileName.includes('katex')
        }
      ]
    })
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve('./src')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-katex': ['katex'],
            'vendor-utils': ['reading-time', 'mdast-util-to-string']
          }
        }
      }
    },
    optimizeDeps: {
      include: ['katex', 'reading-time']
    }
  }
})
