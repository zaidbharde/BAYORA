import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(resolve(projectRoot, relativePath), "utf8");
}

test("Preview permits the Manus proxy suffix without disabling Vite host validation", async () => {
  const [viteConfig, server] = await Promise.all([
    readProjectFile("vite.config.ts"),
    readProjectFile("src/server/index.ts"),
  ]);

  assert.match(viteConfig, /allowedHosts:\s*\["\.sg2\.manus\.computer"\]/);
  assert.doesNotMatch(viteConfig, /allowedHosts:\s*true/);
  assert.match(server, /hmr:\s*options\.hmrServer\s*\?\s*\{\s*server:\s*options\.hmrServer\s*\}\s*:\s*false/);
});
