import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import mermaid from 'astro-mermaid'
import playformInline from '@playform/inline'
import remarkMath from 'remark-math'
import remarkDirective from 'remark-directive'
import rehypeKatex from 'rehype-katex'
import remarkEmbeddedMedia from './src/plugins/remark-embedded-media.mjs'
import remarkReadingTime from './src/plugins/remark-reading-time.mjs'
import rehypeCleanup from './src/plugins/rehype-cleanup.mjs'
import rehypeImageProcessor from './src/plugins/rehype-image-processor.mjs'
import rehypeCopyCode from './src/plugins/rehype-copy-code.mjs'
import remarkTOC from './src/plugins/remark-toc.mjs'
import remarkObsidianCallouts from './src/plugins/remark-obsidian-callouts.mjs'
import { themeConfig } from './src/config'
import { imageConfig } from './src/utils/image-config'
import path from 'path'

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
    remarkPlugins: [remarkObsidianCallouts, remarkMath, remarkDirective, remarkEmbeddedMedia, remarkReadingTime, remarkTOC],
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
