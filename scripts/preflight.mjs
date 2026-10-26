import { readFileSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const passes = [];

const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) {
  problems.push(`Node 22.13+ is required; found ${process.versions.node}.`);
} else {
  passes.push(`Node ${process.versions.node}`);
}
try {
  const database = new DatabaseSync(":memory:");
  database.prepare("SELECT 1 AS ready").get();
  database.close();
  passes.push("built-in node:sqlite can open and query an in-memory database");
} catch {
  problems.push("built-in node:sqlite did not open an in-memory database.");
}
if (packageJson.packageManager !== "pnpm@11.25.0") {
  problems.push(`Expected packageManager pnpm@11.25.0; found ${packageJson.packageManager ?? "unset"}.`);
} else {
  passes.push("pinned pnpm 11.25.0 manifest");
}
if (!existsSync(path.join(root, "pnpm-lock.yaml"))) problems.push("pnpm-lock.yaml is missing; install dependencies first.");
else passes.push("pnpm lockfile present");

const appSource = readFileSync(path.join(root, "src/client/App.tsx"), "utf8");
const routeManifest = JSON.parse(readFileSync(path.join(root, "public/manus-routes.json"), "utf8"));
const appRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]).filter((route) => route !== "*");
const manifestRoutes = routeManifest.routes.map((route) => route.path);
const routeSetsMatch = appRoutes.length === manifestRoutes.length && appRoutes.every((route) => manifestRoutes.includes(route));
if (!routeSetsMatch) problems.push(`Route manifest does not match app routes. Source: ${appRoutes.join(", ")}; manifest: ${manifestRoutes.join(", ")}.`);
else passes.push(`${manifestRoutes.length} page routes declared`);

const example = readFileSync(path.join(root, ".env.example"), "utf8");
if (/\b(?:sk-[A-Za-z0-9]{12,}|gh[uops]_[A-Za-z0-9]{12,}|Bearer\s+[A-Za-z0-9_-]{16,})/.test(example)) {
  problems.push("A credential-like value was found in .env.example.");
} else {
  passes.push("example environment contains no credential-like literal");
}

for (const item of passes) console.log(`PASS  ${item}`);
for (const item of problems) console.error(`FAIL  ${item}`);
if (problems.length === 0) console.log("Preflight complete. No cleanup, network request or data deletion was performed.");
process.exitCode = problems.length === 0 ? 0 : 1;
