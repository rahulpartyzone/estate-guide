/** Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1), with r the monthly rate. */
export function monthlyEmi(principal: number, annualRatePct: number, years: number) {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

/** ₹12,34,567 (Indian digit grouping, no decimals) */
export const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/** ₹75 L / ₹1.25 Cr */
export function inrShort(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1).replace(/\.0$/, "")} L`;
  return inr(v);
}
