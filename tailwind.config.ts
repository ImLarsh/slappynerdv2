import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Game Color Palette */
        sky: {
          start: "hsl(var(--sky-start))",
          end: "hsl(var(--sky-end))",
        },
        nerd: {
          skin: "hsl(var(--nerd-skin))",
          glasses: "hsl(var(--nerd-glasses))",
          shirt: "hsl(var(--nerd-shirt))",
          hair: "hsl(var(--nerd-hair))",
        },
        obstacle: {
          primary: "hsl(var(--obstacle-primary))",
          secondary: "hsl(var(--obstacle-secondary))",
        },
        collectible: {
          gold: "hsl(var(--collectible-gold))",
          glow: "hsl(var(--collectible-glow))",
        },
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          glow: "hsl(var(--secondary-glow))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-sky": "var(--gradient-sky)",
        "gradient-ground": "var(--gradient-ground)",
        "gradient-button": "var(--gradient-button)",
        "gradient-button-green": "var(--gradient-button-green)",
        "gradient-score": "var(--gradient-score)",
      },
      boxShadow: {
        "game": "var(--shadow-game)",
        "soft": "var(--shadow-soft)",
        "glow": "var(--shadow-glow)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "flap": {
          "0%, 100%": { transform: "rotate(-15deg)" },
          "50%": { transform: "rotate(15deg)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--collectible-glow) / 0.5)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--collectible-glow) / 0.8)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "matrix-fall": {
          "0%": { transform: "translateY(-100vh)", opacity: "1" },
          "100%": { transform: "translateY(100vh)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "flap": "flap 0.3s ease-in-out infinite",
        "bounce-in": "bounce-in 0.6s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "matrix-fall-slow": "matrix-fall 8s linear infinite",
        "matrix-fall-medium": "matrix-fall 6s linear infinite",
        "matrix-fall-fast": "matrix-fall 4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
