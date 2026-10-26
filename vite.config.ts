import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    // Manus Preview uses dynamic subdomains inside the SG2 proxy zone; do not disable host checks globally.
    allowedHosts: [".sg2.manus.computer"],
    host: "0.0.0.0",
  },
});
