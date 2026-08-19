// ==============================================================================
// Prompt cache
//
// A meeting can trigger many AI calls in a short window (stage detection,
// script suggestions, alerts) that all share the same expensive-to-build
// prefix: the active business's full context block (identity, positioning,
// commercial rules, brand voice, retrieved knowledge). Rebuilding that block
// and re-sending it to the model on every call wastes tokens, money and
// latency.
//
// This module does two things:
//
// 1. Caches the assembled *business context block* (a string) in-process,
//    keyed by business id + a content hash, so unrelated calls for the same
//    business within the same warm server instance reuse it instantly
//    instead of re-querying and re-formatting knowledge documents.
//
// 2. Keeps that cached block as a stable, byte-identical prefix in every
//    request sent to the model. Most modern inference APIs (including
//    Kimi/Moonshot's OpenAI-compatible endpoint) apply automatic prefix
//    caching / context caching on their side when the leading portion of a
//    prompt is repeated verbatim across requests — so a stable prefix here
//    also reduces provider-side cost and latency, not just our own.
//
// This is an in-memory cache, which is intentional for V1: Vercel serverless
// functions can stay warm between nearby requests within the same meeting,
// which is exactly the window this cache targets. If you outgrow a single
// warm instance (e.g. after moving to your own VPS with multiple worker
// processes), swap the Map below for a shared store (Redis/Upstash) without
// changing any call sites — everything goes through get()/set() here.
// ==============================================================================

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to span a burst of live-meeting calls

function now() {
  return Date.now();
}

/** Simple, dependency-free string hash for cache-key stability checks. */
export function hashContent(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function getCached(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key: string, value: string, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: now() + ttlMs });
  // Opportunistic cleanup so the map doesn't grow unbounded on a long-lived instance.
  if (store.size > 200) {
    for (const [k, v] of store) {
      if (v.expiresAt < now()) store.delete(k);
    }
  }
}

/**
 * Fetches a cached string, or builds + caches it if missing/expired.
 * `builder` is only invoked on a cache miss.
 */
export async function withCache(
  key: string,
  builder: () => Promise<string> | string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<string> {
  const cached = getCached(key);
  if (cached !== null) return cached;
  const built = await builder();
  setCached(key, built, ttlMs);
  return built;
}
