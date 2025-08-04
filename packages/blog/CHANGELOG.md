# blog

## 1.0.0

### Major Changes

- 4fd579e: Migrate blog from Next.js to Astro with improved UI and performance
  - Complete migration from Next.js to Astro framework
  - Improved header with animated title hover effect
  - Enhanced post navigation and layout
  - Better responsive design with optimized content width
  - Reduced body padding for better spacing
  - Removed Next.js backup files to reduce repository size

### Minor Changes

- ed5e88d: Add global navigation and improve user experience
  - Add animated global navigation with motion effects
  - Improve header spacing and visual balance
  - Redesign tab menu with cleaner animations using layoutId
  - Configure ISR for post pages (6 hour revalidation)
  - Fix hydration mismatch errors with theme provider
  - Remove library menu temporarily
  - Clean up duplicate UI elements on main page
  - Switch from static export to hybrid rendering for better flexibility

- ed5e88d: Add blog package to the monorepo

  Migrate the blog package from external repository to this monorepo workspace. The blog package includes:
  - Next.js 13+ with App Router
  - Contentlayer for MDX processing
  - Tailwind CSS with shadcn/ui components
  - Support for blog posts and library content

- ed5e88d: Optimize blog for static export and improve styling
  - Configure Next.js for static export with output: 'export'
  - Add Pretendard font for better Korean typography
  - Style "⸻" symbol as elegant hairlines
  - Make headers transparent for cleaner design
  - Fix code block styling and background consistency
  - Remove dynamic date generation for full static compatibility
  - All pages now fully static (SSG) for optimal performance

### Patch Changes

- 8f613e8: Add interactive animations to theme toggle component
  - Add ripple wave effect on click: circles animate sequentially with 100ms delay
  - Add individual hover effect: only hovered circle scales to 1.2x
  - Remove global hover opacity change in favor of per-circle interactions
  - Smooth transitions with proper timing and easing functions
