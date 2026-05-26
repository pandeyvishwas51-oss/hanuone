import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Brand: deep teal (trust, medical) + warm orange (warmth, action)
        primary: {
          DEFAULT: "#0F4C5C",
          50: "#E7F2F4",
          100: "#C2DEE3",
          400: "#1F6E80",
          500: "#0F4C5C",
          600: "#0a3540",
          700: "#072830"
        },
        accent: {
          DEFAULT: "#FF6B35",
          50: "#FFF2EC",
          100: "#FFD9C7",
          500: "#FF6B35",
          600: "#E45422",
          700: "#B8421A"
        },
        whatsapp: "#25D366",
        bg: "#FFF8F2", // cream background from template
        ink: "#0E2A33",
        muted: "#5C6B73"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
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
