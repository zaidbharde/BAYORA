import { randomUUID } from "node:crypto";
import type { AuditLogEntry } from "@bayora/shared";
import { MemoryCollection } from "../storage.js";

export interface AuditRepository {
  list(): AuditLogEntry[];
  add(entry: AuditLogEntry): AuditLogEntry;
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly logs = new MemoryCollection<AuditLogEntry>();

  list(): AuditLogEntry[] {
    return this.logs.list();
  }

  add(entry: AuditLogEntry): AuditLogEntry {
    return this.logs.upsert(entry);
  }
}

export interface RecordAuditEntryInput {
  actor: string;
  resource: string;
  action: string;
  result: string;
  testId: string | null;
  notes: string;
}

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  record(entry: RecordAuditEntryInput): AuditLogEntry {
    return this.repository.add({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    });
  }
}
export interface AuditModule {
  readonly name: "audit";
}

export const auditModule: AuditModule = {
  name: "audit"
};

