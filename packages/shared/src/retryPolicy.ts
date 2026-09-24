export type RetryDecision = {
  attempt: number;
  delayMs: number;
  exhausted: boolean;
};

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  jitter?: number;
};

export function retryDecision(attempt: number, options: RetryOptions, random = 0.5): RetryDecision {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts));
  const base = Math.max(0, options.baseDelayMs);
  const cap = Math.max(base, options.maxDelayMs ?? Number.MAX_SAFE_INTEGER);
  const jitter = Math.min(1, Math.max(0, options.jitter ?? 0));
  const exponential = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  const spread = exponential * jitter;
  const normalizedRandom = Math.min(1, Math.max(0, random));
  const delayMs = Math.round(Math.max(0, exponential - spread + 2 * spread * normalizedRandom));
  return { attempt, delayMs, exhausted: attempt >= maxAttempts };
}

export function shouldRetry(error: unknown, retryable: (error: unknown) => boolean): boolean {
  return retryable(error);
}
