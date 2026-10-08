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
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
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
        channel: {
          a: "hsl(var(--channel-a))",
          b: "hsl(var(--channel-b))",
        },
      },
      fontFamily: {
        sans: ["Inter", "EmojiFont", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backdropBlur: {
        "2xl": "40px",
        "3xl": "64px",
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
        "orb-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(30px, -20px) scale(1.05)" },
          "50%": { transform: "translate(-20px, 30px) scale(0.95)" },
          "75%": { transform: "translate(-30px, -10px) scale(1.02)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
        "float-reverse": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(-5deg)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "particle-float": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)", opacity: "0.6" },
          "25%": { transform: "translate(20px, -15px) rotate(90deg)", opacity: "0.8" },
          "50%": { transform: "translate(-10px, 20px) rotate(180deg)", opacity: "1" },
          "75%": { transform: "translate(-15px, -10px) rotate(270deg)", opacity: "0.7" },
        },
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '420': '420ms',
        '450': '450ms',
        '520': '520ms',
        '600': '600ms',
        '650': '650ms',
      },
      transitionTimingFunction: {
        // Apple / iOS S-curve easings
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'apple-in': 'cubic-bezier(0.42, 0, 1, 1)',
        'apple-out': 'cubic-bezier(0, 0, 0.58, 1)',
        'apple-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'apple-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        "accordion-down": "accordion-down 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "accordion-up": "accordion-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "orb-drift": "orb-drift 25s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "float": "float 6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "float-reverse": "float-reverse 5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "slide-up": "slide-up 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "scale-in": "scale-in 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "fade-in": "fade-in 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "particle-float": "particle-float 12s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
