import { cva } from "class-variance-authority";

export const navLinkStyles = cva("relative transition-all duration-300", {
  variants: {
    variant: {
      desktop: "h-11 px-6 flex items-center gap-3 rounded-[1.25rem] font-black uppercase text-[11px] tracking-widest group/btn hover:bg-white/5 hover:-translate-y-0.5",
      mobile: "flex items-center gap-3 p-3.5 rounded-xl border border-transparent transition-all duration-300",
      search: "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
      mega: "relative flex items-center gap-2.5 rounded-xl overflow-hidden hover:bg-gradient-to-r hover:from-primary/12 hover:via-primary/8 hover:to-primary/6 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 border border-border/30 hover:border-primary/40 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    },
    active: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]" },
    { variant: "desktop", active: false, className: "text-gray-400 border border-transparent hover:text-primary" },
    { variant: "mobile", active: true, className: "bg-primary/10 text-primary font-bold shadow-sm border-primary/10" },
    { variant: "mobile", active: false, className: "hover:bg-muted font-medium text-foreground/80 hover:text-foreground" },
    { variant: "search", active: true, className: "bg-primary/10 text-primary border-primary/20" },
    { variant: "search", active: false, className: "bg-muted/40 border-transparent hover:bg-muted" },
    { variant: "mega", active: true, className: "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 border-primary/50 shadow-lg shadow-primary/25" },
  ],
});

export const navIconStyles = cva("transition-all duration-300", {
  variants: {
    variant: {
      desktop: "text-muted-foreground group-hover/btn:scale-125 group-hover/btn:rotate-6 group-hover/btn:text-primary opacity-30 group-hover/btn:opacity-100",
      mobile: "",
      search: "",
      mega: "text-muted-foreground transition-all duration-300 block group-hover/item:text-primary",
    },
    active: {
      true: "",
      false: "",
    },
    compact: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "text-primary filter drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" },
    { variant: "mega", active: true, className: "text-primary" },
    { variant: "mega", compact: true, className: "h-3 w-3" },
    { variant: "mega", compact: false, className: "h-3.5 w-3.5" },
  ],
  defaultVariants: {
    active: false,
    compact: false,
  },
});

export const navTextStyles = cva("transition-colors", {
  variants: {
    variant: {
      desktop: "relative z-10 group-hover/btn:rpg-neon-text",
      mobile: "flex-1 text-[15px]",
      search: "text-sm font-semibold truncate",
      mega: "font-semibold leading-tight duration-300 group-hover/item:text-primary",
    },
    active: {
      true: "",
      false: "",
    },
    compact: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "desktop", active: true, className: "text-primary" },
    { variant: "mega", active: true, className: "text-primary" },
    { variant: "mega", compact: true, className: "text-xs md:text-sm" },
    { variant: "mega", compact: false, className: "text-sm md:text-base" },
  ],
  defaultVariants: {
    active: false,
    compact: false,
  },
});

export const navBadgeStyles = cva("rounded-full font-bold whitespace-nowrap", {
  variants: {
    variant: {
      desktop: "absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-black italic flex items-center justify-center border border-black",
      mobile: "px-2 py-0.5 text-[10px] bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm shadow-primary/20",
      search: "px-1.5 py-0.5 text-[10px] rounded-full bg-primary/15 text-primary font-bold",
      mega: "bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/30 transition-all group-hover/item:shadow-lg group-hover/item:scale-110",
    },
    compact: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "mega", compact: true, className: "text-[10px] px-1.5 py-0.5" },
    { variant: "mega", compact: false, className: "text-xs px-2 py-1" },
  ],
  defaultVariants: {
    compact: false,
  },
});

export const navIconWrapStyles = cva("flex items-center justify-center rounded-lg", {
  variants: {
    variant: {
      mobile: "w-8 h-8 transition-colors",
      search: "w-8 h-8 bg-background text-muted-foreground",
      mega: "relative rounded-xl transition-all duration-300 flex-shrink-0 z-10 bg-gradient-to-br from-accent/60 via-accent/40 to-accent/30 group-hover/item:from-primary/25 group-hover/item:via-primary/18 group-hover/item:to-primary/12 shadow-md group-hover/item:shadow-lg group-hover/item:shadow-primary/20 border border-border/20 group-hover/item:border-primary/30",
      desktop: "",
    },
    active: {
      true: "",
      false: "",
    },
    compact: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "mobile", active: true, className: "bg-primary/20 text-primary" },
    { variant: "mobile", active: false, className: "bg-muted text-muted-foreground" },
    { variant: "mega", active: true, className: "from-primary/35 via-primary/25 to-primary/18 shadow-lg shadow-primary/25 border-primary/40" },
    { variant: "mega", compact: true, className: "p-1.5" },
    { variant: "mega", compact: false, className: "p-2" },
  ],
  defaultVariants: {
    active: false,
    compact: false,
  },
});

export const navLayoutStyles = {
  megaItemGlow: "absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 blur-xl",
  megaItemActiveBar: "absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/80 to-primary/60 rounded-l-full",
};

export const categoryStyles = {
  card: cva("relative group/category transition-all duration-300 border backdrop-blur-sm overflow-hidden", {
    variants: {
      active: {
        true: "bg-primary/10 border-primary/20 shadow-lg shadow-primary/5",
        false: "bg-muted/30 border-border/50 hover:bg-muted/40",
      },
      compact: {
        true: "p-3.5 rounded-xl",
        false: "p-5 rounded-2xl",
      },
    },
    defaultVariants: {
      active: false,
      compact: false,
    },
  }),
  header: cva("relative flex items-center gap-3", {
    variants: {
      compact: {
        true: "mb-3",
        false: "mb-5",
      },
    },
    defaultVariants: {
      compact: false,
    },
  }),
  iconWrap: cva("flex items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner shadow-white/5", {
    variants: {
      compact: {
        true: "w-8 h-8",
        false: "w-10 h-10",
      },
    },
    defaultVariants: {
      compact: false,
    },
  }),
  title: cva("font-bold text-foreground leading-none tracking-tight transition-colors duration-300 group-hover/category:text-primary", {
    variants: {
      compact: {
        true: "text-sm",
        false: "text-base",
      },
    },
    defaultVariants: {
      compact: false,
    },
  }),
  count: cva("text-[10px] sm:text-xs font-black rounded-lg px-2 py-0.5 tabular-nums transition-all border", {
    variants: {
      state: {
        priority: "bg-primary text-black border-black/10 shadow-sm",
        search: "bg-primary/20 text-primary border-primary/20",
        neutral: "bg-background/80 text-muted-foreground border-border/50",
      },
    },
    defaultVariants: {
      state: "neutral",
    },
  }),
};

export const triggerStyles = cva("relative flex items-center gap-3 transition-all duration-300", {
  variants: {
    variant: {
      header: "hover:bg-white/5 hover:text-primary",
      menu: "hover:bg-primary/10 hover:text-primary",
    },
    size: {
      header: "px-4 py-2.5",
      menu: "px-4 py-2.5",
    },
    open: {
      true: "text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "header", open: true, className: "bg-primary/20 border-primary/40" },
    { variant: "header", open: false, className: "border border-transparent" },
    { variant: "menu", open: true, className: "bg-primary/15 border-primary/40" },
    { variant: "menu", open: false, className: "border border-transparent" },
  ],
  defaultVariants: {
    open: false,
    size: "header",
  },
});
