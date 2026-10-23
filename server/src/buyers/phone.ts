/** Normalises an Indian mobile number to digits with country code: "098765 43210" -> "919876543210". */
export function normalizePhone(input: string): string {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function isValidPhone(digits: string): boolean {
  return /^\d{11,15}$/.test(digits);
}

/** The same number, comparing the last 10 digits (country code formats vary). */
export function samePhone(a: string, b: string): boolean {
  const x = String(a || '').replace(/\D/g, '');
  const y = String(b || '').replace(/\D/g, '');
  return x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10);
}
