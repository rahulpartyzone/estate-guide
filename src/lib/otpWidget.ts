/**
 * Phone OTP through the MSG91 widget (public/msg91-widget.js). MSG91 sends and checks the code;
 * a correct code returns an access token, which the API confirms with MSG91 before signing anyone in.
 */

/** "098765 43210" or "+91 98765 43210" -> "919876543210" */
export function toMsisdn(input: string): string {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function isValidIndianMobile(input: string): boolean {
  const d = toMsisdn(input);
  return /^91[6-9]\d{9}$/.test(d) || (/^\d{11,15}$/.test(d) && !d.startsWith("91"));
}

/** "919876543210" -> "+91 98765 43210" */
export function formatPhone(msisdn: string): string {
  const d = String(msisdn || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return d ? `+${d}` : "";
}

const w = () => window as any;

let configured = false;

async function configure() {
  const widgetId = (import.meta as any).env?.VITE_MSG91_WIDGET_ID as string | undefined;
  const tokenAuth = (import.meta as any).env?.VITE_MSG91_TOKEN_AUTH as string | undefined;
  if (!widgetId) throw new Error("Phone sign-in isn't set up yet");
  if (typeof w().configureMsg91Widget !== "function") throw new Error("Couldn't load the OTP service. Please refresh and try again.");
  if (!configured) {
    await w().configureMsg91Widget({ widgetId, tokenAuth });
    configured = true;
  }
}

function errorText(e: any, fallback: string) {
  const m = e?.message || e?.error || (typeof e === "string" ? e : "");
  return typeof m === "string" && m && !/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(m) ? m : fallback;
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  await configure();
  try {
    await w().widgetSendOtp(toMsisdn(phone));
  } catch (e) {
    throw new Error(errorText(e, "Couldn't send the code. Please check the number and try again."));
  }
}

export async function resendPhoneOtp(): Promise<void> {
  await configure();
  try {
    await w().widgetRetryOtp(null);
  } catch (e) {
    throw new Error(errorText(e, "Couldn't resend the code. Please wait a moment and try again."));
  }
}

/** Checks the code with MSG91 and returns the access token to hand to the API. */
export async function verifyPhoneOtp(code: string): Promise<string> {
  await configure();
  let result: any;
  try {
    result = await w().widgetVerifyOtp(code.trim());
  } catch (e) {
    throw new Error(errorText(e, "That code didn't work. Please check it and try again."));
  }
  if (result?.type && String(result.type).toLowerCase() !== "success") {
    throw new Error(errorText(result, "That code didn't work. Please check it and try again."));
  }
  const jwtLike = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(v);
  const token = [result?.accessToken, result?.token, result?.access_token, result?.data?.accessToken, result?.data?.token, result?.message].find(
    (v) => typeof v === "string" && (jwtLike(v) || v.length > 20),
  );
  if (!token) throw new Error("The code was accepted but sign-in couldn't finish. Please try again.");
  return token as string;
}
