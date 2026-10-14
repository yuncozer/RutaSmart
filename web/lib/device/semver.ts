/** Compara versiones "x.y.z" (ignora sufijos). Devuelve 1, 0 o -1. */
export function compareVersions(a: string, b: string) {
  const pa = a
    .replace(/^v/, "")
    .split(/[.-]/)
    .map((x) => parseInt(x, 10) || 0);
  const pb = b
    .replace(/^v/, "")
    .split(/[.-]/)
    .map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}
