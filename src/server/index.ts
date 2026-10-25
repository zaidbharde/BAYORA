import express from "express";
import path from "node:path";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createApiRouter } from "./api.js";

try {
  loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function createApplication(hmrServer?: HttpServer) {
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
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(projectRoot, "vite.config.ts"),
      server: {
        middlewareMode: true,
        // Share the Preview-facing HTTP listener; Vite's standalone fallback port is not proxied.
        hmr: hmrServer ? { server: hmrServer } : false,
      },
      appType: "spa",
    });
    app.locals.closeViteServer = () => vite.close();
    app.use(vite.middlewares);
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      vite.ssrFixStacktrace(error as Error);
      response.status(500).type("text/plain").send("The BAYORA development server encountered an error.");
    });
  }

  return app;
}

async function start() {
  const httpServer = createHttpServer();
  const app = await createApplication(httpServer);
  httpServer.on("request", app);
  const port = Number(process.env.PORT || 3000);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`BAYORA prototype listening on 0.0.0.0:${port}`);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const closeVite = app.locals.closeViteServer as (() => Promise<void>) | undefined;
    void (async () => {
      try {
        await closeVite?.();
      } catch (error) {
        console.error("Failed to close the Vite development server cleanly.", error);
        process.exitCode = 1;
      } finally {
        if (httpServer.listening) {
          httpServer.close((error) => {
            if (error) {
              console.error("Failed to close the BAYORA HTTP server cleanly.", error);
              process.exitCode = 1;
            }
          });
        }
      }
    })();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void start();
}
