/**
 * Noon-style design tokens for the USER dashboard homepage.
 *
 * Visual language: flat surfaces, white cards with a visible 1px border,
 * compact right-aligned section headers with a solid accent bar, horizontal
 * snap rails, and small red/amber pill badges. No glass, blur, neon or soft
 * gradients. All colors come from theme tokens so dark mode follows for free.
 */

// ============================================================================
// PAGE CONTAINER — one single width for the whole dashboard
// ============================================================================
export const DASH_CONTAINER = {
  /** The only page-level width wrapper. Sections must not add their own. */
  page: "w-full max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6",
  /** Vertical rhythm between top-level blocks. */
  stack: "space-y-4 sm:space-y-5",
} as const;

// ============================================================================
// SECTION WRAPPER — a section is a flat bordered white panel
// ============================================================================
export const DASH_SECTION = {
  /**
   * Bordered panel that every dashboard section renders as.
   * content-visibility lets the browser skip layout/paint for panels scrolled
   * out of view — the long homepage stays cheap to render end to end.
   */
  panel:
    "bg-card border border-border rounded-xl p-4 sm:p-5 [content-visibility:auto] [contain-intrinsic-size:auto_360px]",
  /** Panel variant for rails: keeps horizontal padding usable for overflow. */
  panelRail:
    "bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_360px]",
  /** Kept for sections that only need the vertical rhythm. */
  padding: "py-4",
} as const;

// ============================================================================
// SECTION HEADER — accent bar + title + subtitle, action pinned to the far side
// ============================================================================
export const DASH_SECTION_HEADER = {
  container: "flex items-start justify-between gap-3 mb-4",
  content: "flex-1 min-w-0 flex items-start gap-2.5",
  /** Solid accent bar before the title — Noon's rail signature. */
  accentBar: "block w-1 h-6 sm:h-7 rounded-full bg-primary shrink-0 mt-0.5",
  titleWrap: "min-w-0",
  title: "text-base sm:text-lg font-black text-foreground tracking-tight truncate",
  subtitle: "text-xs sm:text-[13px] text-muted-foreground font-medium mt-0.5",
  /** Optional small icon rendered inline before the title text. */
  icon: "h-4 w-4 text-primary-strong shrink-0",
  viewAllButton:
    "inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-primary-strong hover:bg-primary/10 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0",
} as const;

// ============================================================================
// HORIZONTAL SCROLL RAIL
// ============================================================================
export const DASH_RAIL = {
  container:
    "flex overflow-x-auto snap-x snap-mandatory gap-3 pb-1 -mx-4 px-4 sm:-mx-5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  item: "snap-start shrink-0",
} as const;

// ============================================================================
// GRIDS
// ============================================================================
export const DASH_GRID = {
  stats: "grid grid-cols-2 lg:grid-cols-4 gap-3",
  cards2: "grid grid-cols-1 md:grid-cols-2 gap-3",
  cards3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",
  tiles: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3",
} as const;

// ============================================================================
// CARDS
// ============================================================================
export const DASH_CARD = {
  base: "bg-card border border-border rounded-xl transition-colors duration-150 hover:border-primary",
  /** Nested card sitting inside a section panel — muted so it separates. */
  inner: "bg-muted/40 border border-border rounded-lg",
  /** Compact metric tile. */
  stat: "bg-muted/40 border border-border rounded-lg p-3",
  statLabel: "text-[11px] font-bold text-muted-foreground",
  statValue: "text-lg sm:text-xl font-black text-foreground tabular-nums",
} as const;

// ============================================================================
// BADGES — small pills, Noon's red/amber accents
// ============================================================================
export const DASH_BADGE = {
  base: "inline-flex items-center gap-1 rounded-md text-[10px] font-black px-1.5 py-0.5",
  hot: "inline-flex items-center gap-1 rounded-md bg-destructive text-destructive-foreground text-[10px] font-black px-1.5 py-0.5",
  primary: "inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary-strong text-[10px] font-black px-1.5 py-0.5",
  neutral: "inline-flex items-center gap-1 rounded-md bg-muted text-muted-foreground text-[10px] font-black px-1.5 py-0.5",
  amber: "inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-black px-1.5 py-0.5",
} as const;

// ============================================================================
// BUTTONS / TABS
// ============================================================================
export const DASH_BUTTON = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold px-4 py-2 hover:opacity-90 transition-opacity",
  outline:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-sm font-bold px-4 py-2 hover:border-primary transition-colors",
  /** Circular icon-only control (refresh, etc.). */
  icon: "inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-primary-strong hover:border-primary transition-colors disabled:opacity-50",
} as const;

export const DASH_TABS = {
  list: "inline-flex items-center gap-1 bg-muted border border-border p-1 rounded-full w-fit",
  tab: "px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap",
  tabActive: "bg-card text-primary-strong shadow-sm",
  tabIdle: "text-muted-foreground hover:text-foreground",
} as const;

// ============================================================================
// PROGRESS BAR
// ============================================================================
export const DASH_PROGRESS = {
  track: "relative h-2 w-full overflow-hidden rounded-full bg-muted",
  bar: "h-full rounded-full bg-primary transition-all duration-300",
} as const;

// ============================================================================
// EMPTY STATE
// ============================================================================
export const DASH_EMPTY = {
  container: "flex flex-col items-center justify-center text-center py-10 px-4",
  icon: "h-10 w-10 text-muted-foreground mb-3",
  title: "text-sm font-bold text-foreground",
  description: "text-xs text-muted-foreground mt-1 max-w-sm",
} as const;

// ============================================================================
// SKELETON
// ============================================================================
export const DASH_SKELETON = {
  base: "bg-muted rounded-lg animate-pulse",
  card: "bg-muted border border-border rounded-xl animate-pulse",
  text: "h-3 bg-muted rounded animate-pulse",
} as const;
