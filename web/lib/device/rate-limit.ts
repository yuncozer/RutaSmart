/**
 * Rate limiting simple en memoria (ventana fija de 1 minuto por clave).
 * En Vercel cada instancia tiene su propia memoria: es una protección básica,
 * suficiente para el MVP. Para algo estricto, usar Redis / Upstash.
 */
export class RateLimiter {
  private hits = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limitPerMinute: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Devuelve { ok, retryAfterS }. */
  check(key: string) {
    const t = this.now();
    const windowStart = t - (t % 60_000);
    const entry = this.hits.get(key);
    if (!entry || entry.windowStart !== windowStart) {
      this.hits.set(key, { windowStart, count: 1 });
      this.gc(windowStart);
      return { ok: true, retryAfterS: 0 };
    }
    entry.count += 1;
    if (entry.count > this.limitPerMinute) {
      return { ok: false, retryAfterS: Math.ceil((windowStart + 60_000 - t) / 1000) };
    }
    return { ok: true, retryAfterS: 0 };
  }

  private gc(currentWindow: number) {
    if (this.hits.size < 10_000) return;
    for (const [k, v] of this.hits) if (v.windowStart !== currentWindow) this.hits.delete(k);
  }
}
