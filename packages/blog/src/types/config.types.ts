// Date format types
export type DateFormat =
  | 'YYYY-MM-DD'
  | 'MM-DD-YYYY'
  | 'DD-MM-YYYY'
  | 'MONTH DAY YYYY'
  | 'DAY MONTH YYYY'

// Site info configuration type
export interface SiteInfo {
  website: string
  title: string
  author: string
  description: string
  language: string
}

// General settings configuration type
export interface GeneralSettings {
  contentWidth: string
  centeredLayout: boolean
  favicon: boolean
  themeToggle: boolean
  footer: boolean
  fadeAnimation: boolean
}

// Hero settings configuration type
export interface HeroSettings {
  flashCards: boolean
  flashCardsCount: number
  keywordMarquee: boolean
  marqueeSpeed: number
  flipWords: boolean
  flipWordsInterval: number
}

// Date settings configuration type
export interface DateSettings {
  dateFormat: DateFormat
  dateSeparator: string
  dateOnRight: boolean
}

// Post settings configuration type
export interface PostSettings {
  readingTime: boolean
  toc: boolean
  imageViewer: boolean
  copyCode: boolean
}

// SEO settings configuration type
export interface SeoSettings {
  ogImage: boolean
  twitterCard: string
  twitterSite: string
  robots: string
  googleAnalytics: string
  googleSiteVerification: string
}

// Geographic settings configuration type
export interface GeoSettings {
  country: string
  region: string
  city: string
  timezone: string
}

// Theme configuration type
export interface ThemeConfig {
  site: SiteInfo
  general: GeneralSettings
  hero: HeroSettings
  date: DateSettings
  post: PostSettings
  seo: SeoSettings
  geo: GeoSettings
}
