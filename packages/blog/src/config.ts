import type { ThemeConfig } from './types/config.types'

export const themeConfig: ThemeConfig = {
  // SITE INFO ///////////////////////////////////////////////////////////////////////////////////////////
  site: {
    website: 'https://blog.dwkim.me', // Site domain
    title: 'dwkim', // Site title
    author: 'dwkim', // Author name
    description: 'Developer & Marathon Runner', // Site description
    language: 'ko-KR' // Default language
  },

  // GENERAL SETTINGS ////////////////////////////////////////////////////////////////////////////////////
  general: {
    contentWidth: '40rem', // Content area width
    centeredLayout: true, // Use centered layout (false for left-aligned)
    favicon: true, // Show favicon on index page
    themeToggle: true, // Show theme toggle button (uses system theme by default)
    footer: true, // Show footer
    fadeAnimation: true // Enable fade animations
  },

  // DATE SETTINGS ///////////////////////////////////////////////////////////////////////////////////////
  date: {
    dateFormat: 'YYYY-MM-DD', // Date format: YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, MONTH DAY YYYY, DAY MONTH YYYY
    dateSeparator: '.', // Date separator: . - / (except for MONTH DAY YYYY and DAY MONTH YYYY)
    dateOnRight: true // Date position in post list (true for right, false for left)
  },

  // POST SETTINGS ///////////////////////////////////////////////////////////////////////////////////////
  post: {
    readingTime: true, // Show reading time in posts
    toc: true, // Show the table of contents (when there is enough page width)
    imageViewer: true, // Enable image viewer
    copyCode: true // Enable copy button in code blocks
  },

  // SEO & METADATA //////////////////////////////////////////////////////////////////////////////////////
  seo: {
    ogImage: true, // Generate OG images for posts
    twitterCard: 'summary_large_image', // Twitter card type
    twitterSite: '@dwkimm', // Twitter username
    robots: 'index, follow', // Robots meta tag
    googleAnalytics: '', // Google Analytics ID
    googleSiteVerification: '' // Google Site Verification
  },

  // GEOGRAPHIC INFO /////////////////////////////////////////////////////////////////////////////////////
  geo: {
    country: 'KR', // ISO country code
    region: 'Seoul', // State/Province/Region
    city: 'Seoul', // City
    timezone: 'Asia/Seoul' // Timezone
  }
}
