import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: string[];
  subject: string;
  html: string;
  replyTo?: { email: string; name?: string };
  /** Extra email headers, e.g. List-Unsubscribe for newsletters. */
  headers?: Record<string, string>;
  /** Brevo tags, handy for filtering its logs. */
  tags?: string[];
}

/**
 * Transactional email through Brevo (the same account already used for admin invites).
 * Env: BREVO_API_KEY, MAIL_FROM_EMAIL (falls back to INVITE_FROM_EMAIL), MAIL_FROM_NAME (falls back to INVITE_FROM_NAME).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get apiKey() {
    return process.env.BREVO_API_KEY || '';
  }

  private get from() {
    return {
      email: process.env.MAIL_FROM_EMAIL || process.env.INVITE_FROM_EMAIL || '',
      name: process.env.MAIL_FROM_NAME || process.env.INVITE_FROM_NAME || 'YourHomeSearch',
    };
  }

  isConfigured() {
    return Boolean(this.apiKey && this.from.email);
  }

  /** Never throws: returns { sent: false, reason } so a mail problem can't break the request that triggered it. */
  async send(message: MailMessage): Promise<{ sent: boolean; reason?: string; status?: number }> {
    if (!this.isConfigured()) return { sent: false, reason: 'BREVO_API_KEY or MAIL_FROM_EMAIL not configured' };
    const to = message.to.map((e) => e.trim()).filter(Boolean);
    if (!to.length) return { sent: false, reason: 'No recipients' };
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey },
        body: JSON.stringify({
          sender: this.from,
          to: to.map((email) => ({ email })),
          subject: message.subject,
          htmlContent: message.html,
          ...(message.replyTo?.email ? { replyTo: message.replyTo } : {}),
          ...(message.headers && Object.keys(message.headers).length ? { headers: message.headers } : {}),
          ...(message.tags?.length ? { tags: message.tags } : {}),
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Brevo ${res.status}: ${body.slice(0, 300)}`);
        let detail = '';
        try { detail = JSON.parse(body)?.message || ''; } catch { /* not JSON */ }
        return { sent: false, status: res.status, reason: `Brevo API error ${res.status}${detail ? `: ${detail}` : ''}` };
      }
      return { sent: true };
    } catch (e) {
      this.logger.warn(`Mail send failed: ${(e as Error).message}`);
      return { sent: false, reason: (e as Error).message };
    }
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
