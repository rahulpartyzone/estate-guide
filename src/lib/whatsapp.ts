/**
 * The number WhatsApp chats go to: the WhatsApp number from Admin -> Company, or the main phone
 * number when that's empty. Returns digits with country code ("919876543210"), or "".
 */
export function whatsappDigits(profile: { whatsappNumber?: string | null; phone?: string | null } | null | undefined): string {
  const raw = String(profile?.whatsappNumber || profile?.phone || "");
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? digits : "";
}
