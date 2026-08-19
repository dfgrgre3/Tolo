import { cva } from "class-variance-authority";

export const navLinkStyles = cva("relative", {
  variants: {
    variant: {
      desktop: "h-11 px-6 flex items-center gap-3 rounded-[1.25rem] font-black uppercase text-[11px] tracking-widest group/btn hover:bg-white/5",
      mobile: "flex items-center gap-3 p-3.5 rounded-xl border border-transparent",
      search: "flex items-center gap-3 p-3 rounded-xl border",
    },
    active: { true: "", false: "" },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_hsl(var(--primary)_/_0.12)]" },
    { variant: "desktop", active: false, className: "text-gray-400 border border-transparent hover:text-primary" },
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

export const navTextStyles = cva("", {
  variants: {
    variant: {
      desktop: "relative z-10 group-hover/btn:rpg-neon-text",
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
      desktop: "absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-black italic flex items-center justify-center border border-black",
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

export const triggerStyles = cva("relative flex items-center gap-3", {
  variants: {
    variant: { header: "hover:bg-white/10 hover:text-primary", menu: "hover:bg-primary/15 hover:text-primary" },
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
