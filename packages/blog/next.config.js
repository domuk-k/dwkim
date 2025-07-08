const { withContentlayer } = require('next-contentlayer2')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   // Next.js 15의 실험적 기능들 (canary 버전에서만 사용 가능)
  //   ppr: true, // Partial Prerendering  
  //   dynamicIO: true // Dynamic IO
  // },
  typescript: {
    // 빌드 시 타입 검사
    ignoreBuildErrors: false,
  },
  eslint: {
    // 빌드 시 ESLint 검사
    ignoreDuringBuilds: false,
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
}

module.exports = withContentlayer(nextConfig)