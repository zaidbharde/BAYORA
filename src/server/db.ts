import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SyntheticRun } from "../shared/types.js";

export const MAX_SERVER_RUNS = 5000;

export class SyntheticRunStoreFullError extends Error {
  constructor() {
    super("Synthetic run storage is full.");
    this.name = "SyntheticRunStoreFullError";
  }
}

export interface SyntheticRunRepository {
  insertMany(runs: readonly SyntheticRun[]): void;
  list(limit: number): SyntheticRun[];
  get(runId: string): SyntheticRun | null;
  count(): number;
  health(): { state: "ready"; count: number; maxRecords: number; schemaVersion: number };
  close(): void;
}

export class SqliteSyntheticRunStore implements SyntheticRunRepository {
  private readonly database: DatabaseSync;
  private closed = false;

  constructor(databasePath = path.resolve("data/bayora.sqlite"), private readonly maxRecords = MAX_SERVER_RUNS) {
    if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > MAX_SERVER_RUNS) {
      throw new RangeError(`maxRecords must be between 1 and ${MAX_SERVER_RUNS}.`);
    }
    if (databasePath !== ":memory:") {
      const resolved = path.resolve(databasePath);
      mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
      databasePath = resolved;
    }

    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    if (databasePath !== ":memory:") this.database.exec("PRAGMA journal_mode = WAL;");
    this.migrate();
  }

  private migrate(): void {
    const versionRow = this.database.prepare("PRAGMA user_version").get() as { user_version: number };
    const version = Number(versionRow.user_version);
    if (!Number.isInteger(version) || version > 1) {
      throw new Error("Unsupported BAYORA database schema version.");
    }
    if (version === 0) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE synthetic_runs (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL UNIQUE,
          scenario_id TEXT NOT NULL CHECK (scenario_id IN (
            'prompt-injection-fixture',
            'tool-allowlist-fixture',
            'output-canary-fixture'
          )),
          outcome TEXT NOT NULL CHECK (outcome IN ('PASS', 'FAIL')),
          completed_at TEXT NOT NULL,
          record_json TEXT NOT NULL
        );
        CREATE INDEX synthetic_runs_completed_at_idx ON synthetic_runs(completed_at);
        PRAGMA user_version = 1;
        COMMIT;
      `);
    }
  }

  insertMany(runs: readonly SyntheticRun[]): void {
    this.assertOpen();
    if (runs.length === 0) return;

    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const current = this.count();
      if (current + runs.length > this.maxRecords) throw new SyntheticRunStoreFullError();
      const insert = this.database.prepare(`
        INSERT INTO synthetic_runs (id, scenario_id, outcome, completed_at, record_json)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const run of runs) {
        if (run.mode !== "synthetic-server") throw new TypeError("Only server-executed synthetic runs may be persisted here.");
        insert.run(run.id, run.scenarioId, run.outcome, run.completedAt, JSON.stringify(run));
      }
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  list(limit: number): SyntheticRun[] {
    this.assertOpen();
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new RangeError("Run list limit must be between 1 and 500.");
    const rows = this.database.prepare(`
      SELECT record_json FROM synthetic_runs ORDER BY sequence DESC LIMIT ?
    `).all(limit) as Array<{ record_json: string }>;
    return rows.map((row) => JSON.parse(row.record_json) as SyntheticRun);
  }

  get(runId: string): SyntheticRun | null {
    this.assertOpen();
    const row = this.database.prepare("SELECT record_json FROM synthetic_runs WHERE id = ?").get(runId) as { record_json: string } | undefined;
    return row ? JSON.parse(row.record_json) as SyntheticRun : null;
  }

  count(): number {
    this.assertOpen();
    const row = this.database.prepare("SELECT COUNT(*) AS count FROM synthetic_runs").get() as { count: number };
    return Number(row.count);
  }

  health(): { state: "ready"; count: number; maxRecords: number; schemaVersion: number } {
    this.assertOpen();
    this.database.prepare("SELECT 1").get();
    const versionRow = this.database.prepare("PRAGMA user_version").get() as { user_version: number };
    return { state: "ready", count: this.count(), maxRecords: this.maxRecords, schemaVersion: Number(versionRow.user_version) };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.database.close();
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("Synthetic run store is closed.");
  }
}
