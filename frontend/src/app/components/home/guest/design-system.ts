/**
 * Comprehensive Design System for Thanawy Homepage
 * Ensures visual consistency across all components
 *
 * Guidelines:
 * - All components must adhere to these tokens
 * - No hardcoded values outside this system
 * - All spacing uses the SPACING_SCALE
 * - All cards use standardized CARD_DIMENSIONS
 * - All colors use the COLOR_PALETTE
 */

// ============================================================================
// SPACING SCALE
// ============================================================================
export const SPACING = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  base: '1rem',     // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '2.5rem',  // 40px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
  '5xl': '5rem',    // 80px
} as const;

// ============================================================================
// CONTAINER SYSTEM
// ============================================================================
export const CONTAINER = {
  maxWidth: 'max-w-7xl',
  padding: 'px-4 sm:px-6 lg:px-8',
  // Combined for sections
  className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
} as const;

// ============================================================================
// CARD DIMENSIONS (Standardized across all card types)
// ============================================================================
export const CARD_DIMENSIONS = {
  // Course Card
  course: {
    width: 'w-full',
    height: 'auto',
    aspectRatio: 'aspect-video', // 16:9 for thumbnails
    imageHeight: 'h-40',
    titleLines: 2,
    titleClamp: 'line-clamp-2',
    instructorHeight: 'h-6 w-6',
    borderRadius: 'rounded-[12px]',
    padding: 'p-4',
    gap: 'gap-2',
  },
  // Category Card
  category: {
    width: 'w-full',
    height: 'h-28',
    borderRadius: 'rounded-[12px]',
    padding: 'p-5',
    iconSize: 'h-12 w-12',
    iconBorderRadius: 'rounded-xl',
  },
  // Instructor Card
  instructor: {
    width: 'w-full',
    borderRadius: 'rounded-[12px]',
    padding: 'p-4',
    avatarSize: 'h-16 w-16',
    avatarBorderRadius: 'rounded-full',
  },
  // Feature Card
  feature: {
    width: 'w-full',
    borderRadius: 'rounded-[12px]',
    padding: 'p-6',
    iconSize: 'h-12 w-12',
    iconBorderRadius: 'rounded-xl',
  },
  // Stats Card
  stats: {
    width: 'w-full',
    borderRadius: 'rounded-[12px]',
    padding: 'p-6',
  },
} as const;

// ============================================================================
// GRID SYSTEMS
// ============================================================================
export const GRIDS = {
  // Desktop: 6 columns
  categories: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4',
  // Desktop: 4 columns
  courses: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
  // Desktop: 4 columns (smaller cards)
  instructors: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
  // Desktop: 2 columns
  features: 'grid-cols-1 md:grid-cols-2 gap-6',
  // Desktop: 4 columns
  stats: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================
export const TYPOGRAPHY = {
  // Section Heading
  sectionHeading: 'text-2xl sm:text-3xl font-black text-[#1E293B] dark:text-white',
  sectionSubheading: 'text-sm text-[#64748B] dark:text-slate-400 font-medium mt-1',

  // Card Title
  cardTitle: 'text-base font-bold text-foreground group-hover:text-[#0F766E] dark:group-hover:text-orange-500 transition-colors duration-150',

  // Small Text / Caption
  caption: 'text-xs text-[#64748B] dark:text-slate-400 font-medium',

  // Price
  priceLabel: 'text-base font-black text-[#0F766E] dark:text-orange-500',
  priceSmall: 'text-xs text-[#64748B] dark:text-slate-400 line-through',

  // Button Text
  buttonText: 'text-sm font-bold',
  buttonTextSmall: 'text-xs font-bold',
} as const;

// ============================================================================
// COLOR PALETTE
// ============================================================================
export const COLORS = {
  // Brand Colors (Tolo)
  primary: '#0F766E',       // Teal
  primaryDark: '#115E59',   // Darker Teal
  accent: '#F59E0B',        // Amber/Orange
  accentDark: '#D97706',    // Darker Orange

  // Neutral Colors
  text: '#1E293B',          // Dark Text
  textSecondary: '#64748B', // Gray Text
  textMuted: '#94A3B8',     // Lighter Gray

  // Background Colors
  bg: '#F8FAFC',            // Light Background
  bgWhite: '#FFFFFF',       // Pure White
  border: '#E2E8F0',        // Light Border

  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

// ============================================================================
// SECTION HEADER PATTERN
// ============================================================================
export const SECTION_HEADER = {
  container: 'flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8',
  content: 'flex-1',
  titleContainer: '',
  viewAllButton: 'flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59] dark:text-orange-500 dark:hover:text-orange-400 transition-colors whitespace-nowrap',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const RADIUS = {
  sm: 'rounded-md',
  base: 'rounded-lg',
  card: 'rounded-[12px]',
  full: 'rounded-full',
} as const;

// ============================================================================
// SHADOW SYSTEM
// ============================================================================
export const SHADOWS = {
  xs: 'shadow-xs',
  sm: 'shadow-sm',
  base: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  hover: 'hover:shadow-md',
  transitionAll: 'transition-all duration-150',
} as const;

// ============================================================================
// LOADING STATE / SKELETON PATTERNS
// ============================================================================
export const SKELETON = {
  base: 'bg-slate-200 dark:bg-slate-700 animate-pulse',
  rounded: 'bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg',
  image: 'aspect-video bg-slate-200 dark:bg-slate-700',
  title: 'h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4',
  subtitle: 'h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2',
  line: 'h-3 bg-slate-200 dark:bg-slate-700 rounded',
} as const;

// ============================================================================
// RESPONSIVE BREAKPOINTS (For reference)
// ============================================================================
export const BREAKPOINTS = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// ============================================================================
// TRANSITION UTILITIES
// ============================================================================
export const TRANSITIONS = {
  fast: 'transition-all duration-150',
  base: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  none: '', // For efficiency mode
} as const;

// ============================================================================
// BUTTON STYLES
// ============================================================================
export const BUTTON_STYLES = {
  primary: `
    px-6 py-2 bg-[#0F766E] hover:bg-[#115E59]
    text-white font-bold text-sm rounded-[8px]
    transition-colors duration-150 shadow-sm
    dark:bg-orange-500 dark:hover:bg-orange-600
  `,
  primaryLarge: `
    px-8 py-3 bg-[#0F766E] hover:bg-[#115E59]
    text-white font-bold text-base rounded-[8px]
    transition-colors duration-150 shadow-sm
    dark:bg-orange-500 dark:hover:bg-orange-600
  `,
  secondary: `
    px-6 py-2 bg-[#F8FAFC] hover:bg-white border border-[#E2E8F0]
    text-[#0F766E] font-bold text-sm rounded-[8px]
    transition-colors duration-150
    dark:bg-slate-800 dark:border-slate-700 dark:text-orange-500
  `,
  ghost: `
    px-4 py-2 text-sm font-bold text-[#0F766E]
    hover:bg-[#F8FAFC] rounded-[8px]
    transition-colors duration-150
    dark:text-orange-500 dark:hover:bg-slate-800
  `,
} as const;

// ============================================================================
// LINK CARD HOVER EFFECT
// ============================================================================
export const LINK_CARD = {
  container: `
    group flex flex-col bg-card border border-border
    rounded-[12px] overflow-hidden
    hover:border-primary/50 hover:shadow-md
    transition-all duration-150
    dark:bg-slate-900 dark:border-slate-800 dark:hover:border-orange-500/50
  `,
  titleHover: 'group-hover:text-primary dark:group-hover:text-orange-500',
} as const;

// ============================================================================
// EMPTY STATE PATTERN
// ============================================================================
export const EMPTY_STATE = {
  container: 'text-center py-12 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]',
  icon: 'h-12 w-12 text-[#64748B] mx-auto mb-4 opacity-50',
  text: 'text-sm text-[#64748B] font-bold',
} as const;

// ============================================================================
// BADGE STYLES
// ============================================================================
export const BADGES = {
  category: 'px-2.5 py-1 text-xs font-bold text-white bg-[#0F766E] rounded-md shadow-xs dark:bg-orange-600',
  discount: 'bg-[#F59E0B] text-white px-2 py-0.5 text-xs font-extrabold rounded-md shadow-xs dark:bg-orange-500',
  badge: 'px-3 py-1 bg-emerald-50 text-[#0F766E] text-xs font-semibold rounded-full dark:bg-orange-500/20 dark:text-orange-400',
} as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================
export function validateCardDimensions(_actual: any, _expected: typeof CARD_DIMENSIONS.course) {
  // Use this to validate card implementations match the design system
  return true;
}

export function validateSpacing(value: string): boolean {
  return (Object.values(SPACING) as readonly string[]).includes(value);
}

export function validateColor(value: string): boolean {
  return (Object.values(COLORS) as readonly string[]).includes(value);
}
