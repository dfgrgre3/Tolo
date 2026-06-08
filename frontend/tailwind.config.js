
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Mobile-first responsive breakpoints
    screens: {
      'xs': '480px',   // Small phones (iPhone SE, etc.)
      'sm': '640px',   // Large phones / small tablets
      'md': '768px',   // Tablets
      'lg': '1024px',  // Laptops / small desktops
      'xl': '1280px',  // Desktops
      '2xl': '1536px', // Large desktops
      '3xl': '1920px', // Ultra-wide displays
    },
    extend: {
      // Maximum widths for containers
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        'screen-3xl': '1920px',
      },
      fontFamily: {
        sans: ['var(--font-alexandria)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        alexandria: ['var(--font-alexandria)', 'sans-serif'],
        jakarta: ['var(--font-sans)', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
          primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
          border: 'hsl(var(--sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--sidebar-ring) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Spacing for safe areas (iOS notches, etc.)
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0)',
        'safe-left': 'env(safe-area-inset-left, 0)',
        'safe-right': 'env(safe-area-inset-right, 0)',
      },
      // All animations disabled
      animation: {},
      keyframes: {},
    },
  },
  plugins: [
    // tailwindcss-animate plugin removed - no animations needed
  ].filter(Boolean),
  darkMode: ['class'],
}
