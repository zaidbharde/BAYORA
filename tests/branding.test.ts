import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(resolve(projectRoot, relativePath), "utf8");
}

test("private package metadata identifies BAYORA and scopes the synthetic-only workbench", async () => {
  const manifest = JSON.parse(await readProjectFile("package.json")) as {
    name: string;
    private: boolean;
    description: string;
    repository: { url: string };
  };

  assert.equal(manifest.name, "bayora-ai-security-workbench");
  assert.equal(manifest.private, true);
  assert.match(manifest.description, /BAYORA/i);
  assert.match(manifest.description, /synthetic-only/i);
  assert.doesNotMatch(manifest.name, /arize|phoenix/i);
  assert.equal(manifest.repository.url, "https://github.com/zaidbharde/BAYORA");
});

test("browser metadata and icon retain the independent BAYORA identity", async () => {
  const [html, icon, projectConfig] = await Promise.all([
    readProjectFile("index.html"),
    readProjectFile("public/bayora-mark.svg"),
    readProjectFile("app.config.ts"),
  ]);

  assert.match(html, /<title>BAYORA — AI Security Workbench<\/title>/);
  assert.match(html, /BAYORA — a controlled workbench for synthetic AI security testing/);
  assert.match(html, /href="\/bayora-mark\.svg"/);
  assert.match(icon, /<svg\b/i);
  assert.doesNotMatch(icon, /arize|phoenix/i);
  assert.match(projectConfig, /logoUrl:\s*"https:\/\//);
});

test("application wordmark is accessible and Phoenix remains an integration status", async () => {
  const [shell, api, server] = await Promise.all([
    readProjectFile("src/client/components/AppShell.tsx"),
    readProjectFile("src/server/api.ts"),
    readProjectFile("src/server/index.ts"),
  ]);

  assert.match(shell, /aria-label="BAYORA overview"/);
  assert.match(shell, /<img src="\/bayora-mark\.svg" alt=""/);
  assert.match(shell, /BAYORA<span>SECURITY WORKBENCH<\/span>/);
  assert.match(shell, /Upstream healthy/);
  assert.doesNotMatch(shell, /label:\s*"[^"]*(?:Arize|Phoenix)/i);
  assert.match(api, /router\.get\("\/phoenix\/status"/);
  assert.match(server, /app\.use\("\/api", createApiRouter/);
});

test("README exposes the brand audit and full dependency-notice index", async () => {
  const [readme, notices] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("docs/THIRD_PARTY_NOTICES.md"),
  ]);

  assert.match(readme, /^# BAYORA — AI Security Workbench/m);
  assert.match(readme, /synthetic-only/i);
  assert.match(readme, /docs\/branding-audit\.md/);
  assert.match(readme, /docs\/THIRD_PARTY_NOTICES\.md/);
  assert.match(notices, /Direct runtime dependencies/);
  assert.match(notices, /Direct development, build, and test dependencies/);
  assert.match(notices, /Elastic License 2\.0/);
  assert.match(notices, /No independent license has been assigned to original BAYORA code/);
});
