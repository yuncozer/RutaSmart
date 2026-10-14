/** Generador pseudoaleatorio con semilla (mulberry32) para simulaciones reproducibles. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    chance: (p: number) => next() < p,
    /** Aproximación de Poisson para tasas pequeñas/medianas. */
    poisson: (lambda: number) => {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= next();
      } while (p > L);
      return k - 1;
    },
    uuid: () => {
      const hex = Array.from({ length: 32 }, () => Math.floor(next() * 16).toString(16));
      hex[12] = "4";
      hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
      const s = hex.join("");
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
    },
  };
}
export type Rng = ReturnType<typeof createRng>;
