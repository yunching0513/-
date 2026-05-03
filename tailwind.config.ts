import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem" },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "PingFang TC",
          "Noto Sans TC",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Stratum identity — surface vs deep coding axes
        surface_axis: "hsl(var(--surface-axis))",
        deep_axis: "hsl(var(--deep-axis))",
        hybrid_axis: "hsl(var(--hybrid-axis))",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 2px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
      boxShadow: {
        // Whisper shadows — warm, paper-like, no glow
        soft: "0 1px 0 0 hsl(30 17% 11% / 0.03), 0 1px 2px 0 hsl(30 17% 11% / 0.04)",
        glow: "0 0 0 1px hsl(30 17% 11% / 0.06), 0 4px 12px -4px hsl(30 17% 11% / 0.08)",
      },
      letterSpacing: {
        tightish: "-0.012em",
        widish: "0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
