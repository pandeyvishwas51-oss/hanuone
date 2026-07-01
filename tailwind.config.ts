import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-in-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.97)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } }
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.45s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
        shimmer: "shimmer 1.6s infinite"
      },
      colors: {
        // Brand: deep teal (trust, medical) + warm orange (warmth, action)
        // Sampled exactly from the Hanuone logo: teal #01586C, orange #FE7D15.
        primary: {
          DEFAULT: "#01586C",
          50: "#E6F1F4",
          100: "#BFDCE3",
          400: "#1B7488",
          500: "#01586C",
          600: "#024656",
          700: "#033543"
        },
        // Orange matched to the Hanuone logo ("ONE" + ECG line)
        accent: {
          DEFAULT: "#FE7D15",
          50: "#FFF2E6",
          100: "#FEDDBC",
          400: "#FE9847",
          500: "#FE7D15",
          600: "#E06806",
          700: "#B45205"
        },
        // `brand` (action/orange) + `trust` (teal) aliases used by the provider
        // onboarding + home-nursing flows. Previously undefined → those pages
        // rendered unstyled. Mapped to the HanuOne orange/teal so everything is
        // one cohesive palette.
        brand: {
          DEFAULT: "#FE7D15",
          50: "#FFF2E6",
          100: "#FEDDBC",
          300: "#FEA85A",
          400: "#FE9847",
          500: "#FE7D15",
          600: "#E06806",
          700: "#B45205",
          800: "#8A3F04"
        },
        trust: {
          DEFAULT: "#01586C",
          50: "#E6F1F4",
          100: "#BFDCE3",
          400: "#1B7488",
          500: "#01586C",
          600: "#024656",
          700: "#033543",
          900: "#06222B"
        },
        whatsapp: "#25D366",
        // Clean, cool-neutral canvas (replaces the dated peachy cream) — reads
        // fresh/clinical and lets the teal + orange brand colors pop.
        bg: "#F5F8F8",
        surface: "#FFFFFF",
        ink: "#0D2A33",     // deep teal-slate for text
        muted: "#5A6B75",
        line: "#E4ECEC"     // hairline borders on the neutral canvas
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        hindi: ["'Noto Sans Devanagari'", "Inter", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 76, 92, 0.06), 0 4px 12px rgba(15, 76, 92, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
