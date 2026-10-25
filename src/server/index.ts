import express from "express";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createApiRouter } from "./api.js";

try {
  loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function createApplication() {
  const app = express();
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", createApiRouter());
  app.use("/api", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(404).json({ error: "API route is unavailable." });
  });

  if (process.env.NODE_ENV === "production") {
    const clientRoot = path.join(projectRoot, "dist/client");
    app.use(express.static(clientRoot, { index: false, maxAge: "1h" }));
    app.use((request, response, next) => {
      if (request.method !== "GET") return next();
      response.sendFile(path.join(clientRoot, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      configFile: path.join(projectRoot, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      vite.ssrFixStacktrace(error as Error);
      response.status(500).type("text/plain").send("The BAYORA development server encountered an error.");
    });
  }

  return app;
}

async function start() {
  const app = await createApplication();
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`BAYORA prototype listening on 0.0.0.0:${port}`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void start();
}
