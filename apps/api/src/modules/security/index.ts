import { randomUUID } from "node:crypto";
import type { SecurityEvent } from "@bayora/shared";
import { MemoryCollection } from "../storage.js";

export interface SecurityEventRepository {
  list(): SecurityEvent[];
  add(event: SecurityEvent): SecurityEvent;
}

export class InMemorySecurityEventRepository implements SecurityEventRepository {
  private readonly events = new MemoryCollection<SecurityEvent>();

  list(): SecurityEvent[] {
    return this.events.list();
  }

  add(event: SecurityEvent): SecurityEvent {
    return this.events.upsert(event);
  }
}

export const createSecurityEvent = (event: Omit<SecurityEvent, "id" | "timestamp">): SecurityEvent => ({
  ...event,
  id: randomUUID(),
  timestamp: new Date().toISOString()
});
export interface SecurityModule {
  readonly name: "security";
}

export const securityModule: SecurityModule = {
  name: "security"
};

