export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) { super(`Write rate limit reached. Retry in ${retryAfterSeconds} seconds.`); }
}

/** Small in-memory fixed-window guard for agent mistakes, not a Telegram-limit bypass. */
export class WriteRateLimiter {
  private readonly entries = new Map<string, number[]>();
  constructor(private readonly maxEvents: number, private readonly windowMs: number, private readonly now: () => number = () => Date.now()) {}

  consume(key: string) {
    const current = this.now();
    const earliest = current - this.windowMs;
    const events = (this.entries.get(key) ?? []).filter((event) => event > earliest);
    if (events.length >= this.maxEvents) throw new RateLimitError(Math.max(1, Math.ceil((events[0]! + this.windowMs - current) / 1_000)));
    events.push(current);
    this.entries.set(key, events);
  }
}
