import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);

  /**
   * Reads the latest configuration from environment. This allows rotating
   * MSG91_AUTH_KEY (and template/sender) by restarting the process OR (in some
   * hosting setups) updating env vars that become visible to the running
   * process without a rebuild. We intentionally do not cache permanently.
   */
  private get config() {
    return {
      authKey: process.env.MSG91_AUTH_KEY,
      sender: process.env.MSG91_SENDER_ID || 'ESTATE',
      templateId: process.env.MSG91_TEMPLATE_ID || '',
      otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS) || 300,
      debug: (process.env.MSG91_DEBUG || '').toLowerCase() === 'true',
      widgetId: process.env.MSG91_WIDGET_ID || '',
    };
  }

  async sendOtp(contact: string, otp: string) {
  const { authKey, templateId, otpTtlSeconds, debug, sender } = this.config;
    if (!authKey) {
      this.logger.warn(`MSG91_AUTH_KEY not set; skipping OTP send for ${contact} (OTP=${otp})`);
      return;
    }
    // Determine if contact is phone (digits + optional +) or email
    const isPhone = /^\+?\d{6,15}$/.test(contact);
    try {
      if (isPhone) {
        // SMS OTP endpoint (POST with query params to match provider example)
        const url = new URL('https://control.msg91.com/api/v5/otp');
        url.searchParams.set('template_id', templateId);
        url.searchParams.set('mobile', contact.replace(/^[+]/, ''));
        // Keep sending the OTP we generated so our local verification works
        // OTP expiry in minutes (derived from env)
        url.searchParams.set('otp_expiry', String(Math.floor(otpTtlSeconds / 60)));
        // Include authkey and realTimeResponse in query to match sample
        url.searchParams.set('authkey', authKey);
        url.searchParams.set('realTimeResponse', '1');
        // if (sender) {
        //   url.searchParams.set('sender', sender);
        // }
        if (debug) {
          // Do not log auth key or the OTP itself in debug to avoid leakage
          const redacted = new URL(url.toString());
          this.logger.debug(`[MSG91] Request URL (redacted): ${redacted.toString()}`);
        }
        const resp = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authkey: authKey,
          },
          body: '{"broucher":"test"}',
        });
        const bodyText = await resp.text();
        if (!resp.ok) {
          this.logger.error(`MSG91 OTP SMS failed: ${resp.status} ${bodyText}`);
        } else if (debug) {
          this.logger.debug(`[MSG91] Response ${resp.status}: ${bodyText}`);
        }
      } else {
        // Email not implemented – log only
        this.logger.log(`OTP ${otp} for email ${contact}`);
      }
    } catch (e: any) {
      this.logger.error('MSG91 send error', e?.message || e);
    }
  }

  /**
   * Verify MSG91 Widget access token. This is used when the client integrates
   * MSG91's OTP widget, which performs send+verify on the client and returns
   * an access token to be validated server-side.
   */
  async verifyWidgetAccessToken(accessToken: string) {
    const { authKey, debug } = this.config;
    if (!authKey) {
      this.logger.warn('MSG91_AUTH_KEY not set; cannot verify widget access token');
      return { type: 'error', message: 'Missing auth key' };
    }
    try {
      const url = new URL('https://control.msg91.com/api/v5/widget/verifyAccessToken');
      const body = { authkey: authKey, 'access-token': accessToken } as any;
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json().catch(async () => ({ raw: await resp.text() }));
      if (!resp.ok) {
        this.logger.error(`MSG91 widget verify failed: ${resp.status} ${JSON.stringify(json)}`);
      } else if (debug) {
        this.logger.debug(`[MSG91] Widget verify response ${resp.status}: ${JSON.stringify(json)}`);
      }
      return json;
    } catch (e: any) {
      this.logger.error('MSG91 widget verify error', e?.message || e);
      return { type: 'error', message: e?.message || 'verify error' };
    }
  }

  /**
   * Initiate MSG91 Widget OTP delivery to an identifier (email or mobile).
   * POST https://api.msg91.com/api/v5/widget/sendOtp
   */
  async sendWidgetOtp(identifier: string) {
    const { authKey, widgetId, debug } = this.config;
    if (!authKey) {
      this.logger.warn('MSG91_AUTH_KEY not set; cannot send widget OTP');
      return { type: 'error', message: 'Missing auth key' };
    }
    if (!widgetId) {
      this.logger.warn('MSG91_WIDGET_ID not set; cannot send widget OTP');
      return { type: 'error', message: 'Missing widgetId' };
    }
    try {
      const url = new URL('https://api.msg91.com/api/v5/widget/sendOtp');
      const payload = { widgetId, identifier };
      if (debug) this.logger.debug(`[MSG91] Widget sendOtp -> ${JSON.stringify({ ...payload, identifier: '***redacted***' })}`);
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authkey: authKey, accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(async () => ({ raw: await resp.text() }));
      if (!resp.ok) {
        this.logger.error(`MSG91 widget sendOtp failed: ${resp.status} ${JSON.stringify(json)}`);
      } else if (debug) {
        this.logger.debug(`[MSG91] Widget sendOtp response ${resp.status}: ${JSON.stringify(json)}`);
      }
      return json;
    } catch (e: any) {
      this.logger.error('MSG91 widget sendOtp error', e?.message || e);
      return { type: 'error', message: e?.message || 'sendOtp error' };
    }
  }

  /**
   * Server-side OTP verification using MSG91 verify endpoint.
   * Useful fallback when widget verify does not return an access token.
   */
  async verifyOtpExternal(contact: string, otp: string) {
    const { authKey, debug } = this.config;
    if (!authKey) return { type: 'error', message: 'Missing auth key' };
    try {
      const url = new URL('https://control.msg91.com/api/v5/otp/verify');
      const mobile = contact.replace(/^\+/, '');
      url.searchParams.set('mobile', mobile);
      url.searchParams.set('otp', otp);
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { authkey: authKey, accept: 'application/json', 'content-type': 'application/json' },
        body: '{}',
      });
      const json = await resp.json().catch(async () => ({ raw: await resp.text() }));
      if (!resp.ok) {
        this.logger.error(`MSG91 verify OTP failed: ${resp.status} ${JSON.stringify(json)}`);
      } else if (debug) {
        this.logger.debug(`[MSG91] Verify OTP response ${resp.status}: ${JSON.stringify(json)}`);
      }
      return json;
    } catch (e: any) {
      this.logger.error('MSG91 verify OTP error', e?.message || e);
      return { type: 'error', message: e?.message || 'verify error' };
    }
  }
}
