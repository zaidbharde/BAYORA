export class MemoryCollection<T extends { id: string }> {
  private readonly items = new Map<string, T>();

  constructor(initialItems: T[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, item);
    }
  }

  list(): T[] {
    return Array.from(this.items.values());
  }

  getById(id: string): T | null {
    return this.items.get(id) ?? null;
  }

  upsert(item: T): T {
    this.items.set(item.id, item);
    return item;
  }
}
