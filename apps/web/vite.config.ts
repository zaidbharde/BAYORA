import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number.parseInt(env.WEB_PORT ?? "5173", 10);

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: false
    }
  };
});

