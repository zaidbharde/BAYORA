import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bayora: {
          ink: "#0A0F1A",
          panel: "#101827",
          border: "#263244",
          signal: "#2DD4BF",
          warn: "#F59E0B",
          alert: "#EF4444"
        }
      }
    }
  },
  plugins: []
} satisfies Config;

