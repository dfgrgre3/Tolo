/**
 * Homepage Configuration
 * إعدادات الصفحة الرئيسية المركزية
 */

/**
 * Section Configuration
 */
export const SECTION_CONFIG = {
  // Hero Section
  hero: {
    enabled: true,
    lazyLoad: false, // Always visible
    priority: 1,
  },

  // Why Us Section
  whyUs: {
    enabled: true,
    lazyLoad: false,
    priority: 2,
  },

  // Categories Section
  categories: {
    enabled: true,
    lazyLoad: false,
    priority: 3,
    itemsPerPage: 12,
  },

  // Featured Courses
  featuredCourses: {
    enabled: true,
    lazyLoad: true,
    priority: 4,
    itemsToShow: 4,
  },

  // Main Courses
  courses: {
    enabled: true,
    lazyLoad: false,
    priority: 5,
    itemsPerPage: 8,
  },

  // New Courses
  newCourses: {
    enabled: true,
    lazyLoad: true,
    priority: 6,
    itemsToShow: 4,
  },

  // Best Teachers
  bestTeachers: {
    enabled: true,
    lazyLoad: true,
    priority: 7,
    itemsToShow: 6,
  },

  // Free Resources
  freeResources: {
    enabled: true,
    lazyLoad: true,
    priority: 8,
    itemsToShow: 4,
  },

  // Trending Topics
  trendingTopics: {
    enabled: true,
    lazyLoad: true,
    priority: 9,
    itemsToShow: 8,
  },

  // Learning Paths
  learningPaths: {
    enabled: true,
    lazyLoad: true,
    priority: 10,
    itemsToShow: 6,
  },

  // Specialization Tracks
  specialization: {
    enabled: true,
    lazyLoad: true,
    priority: 11,
    itemsToShow: 6,
  },

  // Exam Preparation
  examPrep: {
    enabled: true,
    lazyLoad: true,
    priority: 12,
    itemsToShow: 6,
  },

  // How It Works
  howItWorks: {
    enabled: true,
    lazyLoad: true,
    priority: 13,
  },

  // Testimonials
  testimonials: {
    enabled: true,
    lazyLoad: true,
    priority: 14,
    itemsToShow: 6,
  },

  // Promotional CTA
  promotionalCta: {
    enabled: true,
    lazyLoad: true,
    priority: 15,
  },

  // Platform Stats
  stats: {
    enabled: true,
    lazyLoad: true,
    priority: 16,
  },

  // Achievement Strip
  achievements: {
    enabled: true,
    lazyLoad: true,
    priority: 17,
  },

  // All Instructors
  instructors: {
    enabled: true,
    lazyLoad: true,
    priority: 18,
    itemsPerPage: 12,
  },

  // Blog Section
  blog: {
    enabled: true,
    lazyLoad: true,
    priority: 19,
    itemsToShow: 4,
  },

  // Partners Section
  partners: {
    enabled: true,
    lazyLoad: true,
    priority: 20,
  },

  // FAQ Section
  faq: {
    enabled: true,
    lazyLoad: true,
    priority: 21,
    itemsToShow: 8,
  },

  // Instructor CTA
  instructorCta: {
    enabled: true,
    lazyLoad: true,
    priority: 22,
  },

  // Newsletter
  newsletter: {
    enabled: true,
    lazyLoad: true,
    priority: 23,
  },
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Performance Configuration
 */
export const PERFORMANCE_CONFIG = {
  enableLazyLoading: true,
  enableImageOptimization: true,
  enableCodeSplitting: true,
  enablePrefetching: true,
  lazyLoadThreshold: 0.1,
  lazyLoadRootMargin: '50px',
  imageSizes: [360, 640, 1024, 1440, 1920],
  imageQuality: 85,
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  theme: 'light',
  supportsDarkMode: true,
  defaultPageSize: 20,
  maxPageSize: 100,
  animationDuration: 300,
  transitionTiming: 'ease-in-out',
} as const;

/**
 * Feature Flags
 */
export const FEATURES = {
  enableAnalytics: true,
  enableErrorTracking: true,
  enablePerformanceMonitoring: true,
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableTestingFeatures: process.env.NODE_ENV === 'development',
} as const;

/**
 * Get section configuration
 */
export function getSectionConfig(sectionName: keyof typeof SECTION_CONFIG) {
  return SECTION_CONFIG[sectionName];
}

/**
 * Check if section is enabled
 */
export function isSectionEnabled(sectionName: keyof typeof SECTION_CONFIG): boolean {
  return getSectionConfig(sectionName).enabled;
}

/**
 * Should lazy load section
 */
export function shouldLazyLoadSection(sectionName: keyof typeof SECTION_CONFIG): boolean {
  return getSectionConfig(sectionName).lazyLoad;
}

/**
 * Get section priority
 */
export function getSectionPriority(sectionName: keyof typeof SECTION_CONFIG): number {
  return getSectionConfig(sectionName).priority;
}
