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
        primary: { DEFAULT: "#023E8A", 50: "#E6EEF8", 100: "#C2D4EC", 500: "#023E8A", 600: "#012F6B", 700: "#01214C" },
        accent: { DEFAULT: "#00B4D8", light: "#90E0EF" },
        bg: "#F0FAFF",
        ink: "#03045E",
        muted: "#64748B"
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
