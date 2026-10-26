import express from "express";
import path from "node:path";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createApiRouter } from "./api.js";
import { SqliteSyntheticRunStore, type SyntheticRunRepository } from "./db.js";

try {
  loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const entryPath = fileURLToPath(import.meta.url);
const entryDirectory = path.dirname(entryPath);
const projectRoot = path.resolve(entryDirectory, entryPath.split(path.sep).includes("dist") ? "../../.." : "../..");

export interface ApplicationOptions {
  hmrServer?: HttpServer;
  runStore?: SyntheticRunRepository;
}

export async function createApplication(options: ApplicationOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    const parserError = error as { type?: string };
    if (parserError?.type === "entity.parse.failed") {
      response.setHeader("Cache-Control", "no-store");
      response.status(400).json({ error: "invalid_json", message: "Request body must be valid JSON." });
      return;
    }
    if (parserError?.type === "entity.too.large") {
      response.setHeader("Cache-Control", "no-store");
      response.status(413).json({ error: "request_too_large", message: "Request body exceeds the 16 KiB limit." });
      return;
    }
    next(error);
  });
  app.use("/api", createApiRouter({ runStore: options.runStore }));
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
        hmr: options.hmrServer ? { server: options.hmrServer } : false,
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
  const databasePath = process.env.BAYORA_DATABASE_PATH?.trim() || path.join(projectRoot, "data/bayora.sqlite");
  const runStore = new SqliteSyntheticRunStore(databasePath);
  const httpServer = createHttpServer();
  let app: Awaited<ReturnType<typeof createApplication>>;
  try {
    app = await createApplication({ hmrServer: httpServer, runStore });
  } catch (error) {
    runStore.close();
    throw error;
  }
  httpServer.on("request", app);
  const configuredPort = Number(process.env.PORT || 3000);
  if (!Number.isInteger(configuredPort) || configuredPort < 1024 || configuredPort > 65535) {
    const closeVite = app.locals.closeViteServer as (() => Promise<void>) | undefined;
    if (closeVite) await closeVite();
    runStore.close();
    throw new Error("PORT must be an integer from 1024 to 65535.");
  }
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    httpServer.once("error", onError);
    httpServer.listen(configuredPort, "0.0.0.0", () => {
      httpServer.off("error", onError);
      console.log(`BAYORA synthetic backend listening on 0.0.0.0:${configuredPort}`);
      resolve();
    });
  }).catch(async (error: unknown) => {
    const closeVite = app.locals.closeViteServer as (() => Promise<void>) | undefined;
    await closeVite?.();
    runStore.close();
    throw error;
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const closeVite = app.locals.closeViteServer as (() => Promise<void>) | undefined;
    void (async () => {
      try {
        await closeVite?.();
      } catch {
        console.error("Failed to close the Vite development server cleanly.");
        process.exitCode = 1;
      } finally {
        httpServer.close((error) => {
          if (error) {
            console.error("Failed to close the BAYORA HTTP server cleanly.");
            process.exitCode = 1;
          }
          try {
            runStore.close();
          } catch {
            console.error("Failed to close the BAYORA SQLite store cleanly.");
            process.exitCode = 1;
          }
        });
      }
    })();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void start().catch(() => {
    console.error("BAYORA failed to start; check the configured port and database path.");
    process.exitCode = 1;
  });
}
