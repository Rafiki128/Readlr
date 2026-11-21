// Paired statistics for the SMART goal report; distribution functions are implemented here to avoid a stats dependency.

/** Complementary error function (Numerical Recipes erfcc, fractional error below 1.2e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807
    + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

export const normalCdf = (z: number) => 0.5 * erfc(-z / Math.SQRT2);

function logGamma(x: number): number {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, ser = 1.000000000190015;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  for (const c of cof) ser += c / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Continued fraction for the incomplete beta function (modified Lentz method).
function betaFraction(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  d = 1 / (Math.abs(d) < tiny ? tiny : d);
  let h = d;
  for (let m = 1; m <= 300; m++) {
    for (const aa of [m * (b - m) * x / ((a - 1 + 2 * m) * (a + 2 * m)), -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 1 + 2 * m))]) {
      d = 1 + aa * d; d = 1 / (Math.abs(d) < tiny ? tiny : d);
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 3e-14) break;
  }
  return h;
}

export function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? front * betaFraction(a, b, x) / a : 1 - front * betaFraction(b, a, 1 - x) / b;
}

/** Two-sided p-value of Student's t with df degrees of freedom. */
export const tTwoSidedP = (t: number, df: number) => regularizedBeta(df / (df + t * t), df / 2, 0.5);

export const mean = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function sampleSd(xs: number[]): number {
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Wilcoxon signed-rank, normal approximation without continuity correction; zeros dropped, tied ranks averaged. */
export function wilcoxon(diffs: number[]) {
  const nonzero = diffs.filter(d => d !== 0).sort((a, b) => Math.abs(a) - Math.abs(b));
  const n = nonzero.length;
  if (!n) return { w: 0, n, z: 0, p: 1, r: null as number | null };
  let wPlus = 0, tieTerm = 0;
  for (let i = 0; i < n;) {
    let j = i;
    while (j < n && Math.abs(nonzero[j]) === Math.abs(nonzero[i])) j++;
    const rank = (i + 1 + j) / 2, ties = j - i;
    tieTerm += ties ** 3 - ties;
    for (let k = i; k < j; k++) if (nonzero[k] > 0) wPlus += rank;
    i = j;
  }
  const sd = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24 - tieTerm / 48);
  const z = (wPlus - n * (n + 1) / 4) / sd;
  return { w: wPlus, n, z, p: Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))), r: z / Math.sqrt(n) };
}

/** Paired t-test and Cohen's dz; t, p and dz are null when every difference is equal. */
export function pairedT(diffs: number[]) {
  const df = diffs.length - 1, m = mean(diffs)!;
  if (diffs.every(d => d === 0)) return { t: null, df, p: 1, dz: null, significant: false };
  const sd = sampleSd(diffs);
  if (sd === 0) return { t: null, df, p: null, dz: null, significant: false };
  const t = m / (sd / Math.sqrt(diffs.length)), p = tTwoSidedP(t, df);
  return { t, df, p, dz: m / sd, significant: p < 0.05 };
}

export interface PairedStats {
  measure: string; n: number;
  pre: { mean: number | null; median: number | null }; post: { mean: number | null; median: number | null };
  difference: { mean: number | null; median: number | null; min: number | null; max: number | null };
  positive: number; zero: number; negative: number;
  wilcoxon: ReturnType<typeof wilcoxon> | null; tTest: ReturnType<typeof pairedT> | null; note: string;
}

/** Descriptive paired results plus Wilcoxon and t-test; tests need at least two learners. */
export function pairedStats(measure: string, pairs: Array<{ pre: number; post: number }>): PairedStats {
  const diffs = pairs.map(p => p.post - p.pre);
  const enough = pairs.length >= 2;
  const equal = enough && diffs.every(d => d === diffs[0]);
  return {
    measure, n: pairs.length,
    pre: { mean: mean(pairs.map(p => p.pre)), median: median(pairs.map(p => p.pre)) },
    post: { mean: mean(pairs.map(p => p.post)), median: median(pairs.map(p => p.post)) },
    difference: { mean: mean(diffs), median: median(diffs), min: diffs.length ? Math.min(...diffs) : null, max: diffs.length ? Math.max(...diffs) : null },
    positive: diffs.filter(d => d > 0).length, zero: diffs.filter(d => d === 0).length, negative: diffs.filter(d => d < 0).length,
    wilcoxon: enough ? wilcoxon(diffs) : null, tTest: enough ? pairedT(diffs) : null,
    note: !enough ? 'Fewer than 2 learners; tests not run.' : equal && diffs[0] === 0 ? 'All differences are zero.' : equal ? 'All differences are equal; t-test undefined.' : '',
  };
}
