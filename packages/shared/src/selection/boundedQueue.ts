export class BoundedQueue<T> {
  private readonly values: T[] = [];

  public constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("Queue capacity must be a positive integer");
    }
  }

  public enqueue(value: T): T | undefined {
    const evicted = this.values.length === this.capacity ? this.values.shift() : undefined;
    this.values.push(value);
    return evicted;
  }

  public dequeue(): T | undefined {
    return this.values.shift();
  }

  public peek(): T | undefined {
    return this.values[0];
  }

  public get size(): number {
    return this.values.length;
  }

  public toArray(): T[] {
    return [...this.values];
  }
}
