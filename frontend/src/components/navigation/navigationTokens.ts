import { cva } from "class-variance-authority";

export const navLinkStyles = cva("relative no-underline decoration-transparent underline-offset-0 hover:no-underline", {
  variants: {
    variant: {
      desktop: "h-10 px-4 flex items-center gap-2 rounded-xl font-black uppercase text-[11px] tracking-wide group/btn",
      mobile: "flex items-center gap-3 p-3.5 rounded-xl border border-transparent",
      search: "flex items-center gap-3 p-3 rounded-xl border",
    },
    active: { true: "", false: "" },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "bg-primary/10 text-primary border border-primary/20" },
    { variant: "desktop", active: false, className: "text-gray-400 border border-transparent hover:text-primary hover:bg-primary/5" },
    { variant: "mobile", active: true, className: "bg-primary/10 text-primary font-bold shadow-sm border-primary/10" },
    { variant: "mobile", active: false, className: "hover:bg-muted font-medium text-foreground/80 hover:text-foreground" },
    { variant: "search", active: true, className: "bg-primary/10 text-primary border-primary/20" },
    { variant: "search", active: false, className: "bg-muted/40 border-transparent hover:bg-muted" },
  ],
});

export const navIconStyles = cva("", {
  variants: {
    variant: {
      desktop: "text-muted-foreground group-hover/btn:text-primary opacity-30 group-hover/btn:opacity-100",
      mobile: "",
      search: "",
    },
    active: { true: "", false: "" },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "text-primary filter drop-shadow-[0_0_8px_hsl(var(--primary)_/_0.8)]" },
  ],
  defaultVariants: { active: false },
});

export const navTextStyles = cva("relative z-10", {
  variants: {
    variant: {
      desktop: "",
      mobile: "flex-1 text-[15px]",
      search: "text-sm font-semibold truncate",
    },
    active: { true: "", false: "" },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "text-primary" },
  ],
  defaultVariants: { active: false },
});

export const navBadgeStyles = cva("rounded-full font-bold whitespace-nowrap", {
  variants: {
    variant: {
      desktop: "absolute -top-1 -end-1 bg-amber-500 text-black text-[9px] font-black italic flex items-center justify-center border border-black",
      mobile: "px-2 py-0.5 text-[10px] bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm shadow-primary/20",
      search: "px-1.5 py-0.5 text-[10px] rounded-full bg-primary/15 text-primary font-bold",
    },
  },
});

export const navIconWrapStyles = cva("flex items-center justify-center rounded-lg", {
  variants: {
    variant: {
      mobile: "w-8 h-8",
      search: "w-8 h-8 bg-background text-muted-foreground",
      desktop: "",
    },
    active: { true: "", false: "" },
  },
  compoundVariants: [
    { variant: "mobile", active: true, className: "bg-primary/20 text-primary" },
    { variant: "mobile", active: false, className: "bg-muted text-muted-foreground" },
  ],
  defaultVariants: { active: false },
});

export const triggerStyles = cva("relative flex items-center gap-3 no-underline decoration-transparent underline-offset-0 hover:no-underline", {
  variants: {
    variant: { header: "", menu: "" },
    size: { header: "px-4 py-2.5", menu: "px-4 py-2.5" },
    open: { true: "text-primary shadow-[0_0_25px_hsl(var(--primary)_/_0.5)]", false: "" },
  },
  compoundVariants: [
    { variant: "header", open: true, className: "bg-primary/25 border-primary/50 shadow-lg shadow-primary/25" },
    { variant: "header", open: false, className: "border border-transparent" },
    { variant: "menu", open: true, className: "bg-primary/20 border-primary/50" },
    { variant: "menu", open: false, className: "border border-transparent" },
  ],
  defaultVariants: { open: false, size: "header" },
});

/**
 * First-row utility links ("درّس", "وظائف", "الباقات") and the schools
 * mega-menu trigger sit side by side in the header and must read as one
 * family. Declaring the class once here keeps them from drifting into the
 * slightly-different hand-written copies they used to be, and means the
 * header has a single border/spacing rule for that whole row instead of
 * each element drawing its own frame.
 */
export const utilityLinkStyles = cva(
  "h-10 px-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  {
    variants: {
      active: { true: "text-primary border-primary/20 bg-primary/5", false: "" },
    },
    defaultVariants: { active: false },
  }
);

/**
 * Second-row main-nav triggers. The nav row is the primary navigation, so its
 * triggers read heavier than the first-row utility links (bold, tighter type)
 * but follow the same border discipline: 1px transparent border at rest so the
 * active/open tint does not shift the trigger by a pixel when it appears.
 *
 * The three states are mutually exclusive (open wins over active), which is
 * why they are one variant instead of two booleans — the previous hand-written
 * version set border width only in the rest/active states and omitted it when
 * open, so opening the menu visibly nudged the trigger.
 */
export const mainNavTriggerStyles = cva(
  "relative h-10 px-4 inline-flex items-center gap-2 rounded-xl font-bold text-xs tracking-normal border outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  {
    variants: {
      state: {
        rest: "text-muted-foreground border-transparent hover:text-primary hover:bg-primary/5",
        active: "bg-primary/10 text-primary border-primary/20",
        open: "bg-primary/20 text-primary border-primary/40",
      },
    },
    defaultVariants: { state: "rest" },
  }
);
