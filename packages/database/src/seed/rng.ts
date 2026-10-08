/** Deterministic PRNG so the demo dataset is identical on every machine. */
export function createRng(seed = 20261008) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number) => next() * (max - min) + min,
    chance: (p: number) => next() < p,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    pickN: <T>(arr: readonly T[], n: number): T[] => {
      const copy = [...arr];
      const out: T[] = [];
      while (out.length < n && copy.length) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      return out;
    },
    weighted: <K extends string>(weights: Partial<Record<K, number>>): K => {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((s, [, w]) => s + (w ?? 0), 0);
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= w ?? 0;
        if (r <= 0) return k;
      }
      return entries[entries.length - 1][0];
    },
    /** Normal-ish noise via sum of uniforms, centred on 1 */
    noise: (spread: number) => 1 + ((next() + next() + next()) / 3 - 0.5) * 2 * spread,
  };
  return rng;
}
export type Rng = ReturnType<typeof createRng>;
