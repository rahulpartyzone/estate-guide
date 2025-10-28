/*
  MSG91 Widget integration shim
  Replace the implementation below with actual MSG91 widget invocation per their docs.
  Contract: window.openMsg91OtpWidget(options) => Promise<string>
  - Should resolve with an accessToken string when user completes OTP in the widget.
  - Should reject with an Error/message if user cancels or verification fails.

  Example to implement (pseudo):
  window.openMsg91OtpWidget = ({ phoneHint }) => new Promise((resolve, reject) => {
    // 1) Load MSG91 widget if not already loaded
    // 2) Open widget with config (template, etc.)
    // 3) On success, widget returns an access token; call resolve(token)
    // 4) On failure/cancel, call reject(new Error('cancelled'))
  });
*/
(function(){
  const SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js';
  let scriptLoading = null;
  function loadScript() {
    if (window.initSendOTP) return Promise.resolve();
    if (scriptLoading) return scriptLoading;
    scriptLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load MSG91 widget script'));
      document.head.appendChild(s);
    });
    return scriptLoading;
  }

  // Configure and initialize MSG91 widget with exposeMethods=true
  // config: { widgetId: string; tokenAuth?: string; captchaRenderId?: string; }
  async function configureMsg91Widget(config) {
    await loadScript();
    if (typeof window.initSendOTP !== 'function') throw new Error('MSG91 initSendOTP not available');
    try { console.debug('[MSG91-Widget] initSendOTP config', { widgetId: config.widgetId, hasTokenAuth: !!config.tokenAuth, captchaRenderId: config.captchaRenderId }); } catch(_) {}
    const configuration = {
      widgetId: config.widgetId,
      tokenAuth: config.tokenAuth,
      exposeMethods: true,
      // Optional top-level success/failure (we mostly rely on per-call callbacks)
      success: function(data){ /* no-op */ },
      failure: function(err){ /* no-op */ },
    };
    window.initSendOTP(configuration);
    if (!(window.sendOtp && window.verifyOtp)) {
      throw new Error('MSG91 exposeMethods did not attach sendOtp/verifyOtp');
    }
  }

  // Promise wrappers around exposed methods
  function widgetSendOtp(identifier, reqId) {
    return new Promise((resolve, reject) => {
      if (!window.sendOtp) return reject(new Error('MSG91 sendOtp not available'));
      try {
        try { console.debug('[MSG91-Widget] sendOtp request', { identifier: (identifier||'').replace(/.(?=.{4})/g,'*'), reqId }); } catch(_) {}
        // sendOtp(identifier, success, failure)
        window.sendOtp(
          identifier,
          function(data){
            try { console.debug('[MSG91-Widget] sendOtp success', data); } catch(_) {}
            const derivedReqId = (data && (data.message || data.reqId || data.request_id)) || undefined;
            if (derivedReqId) {
              try { console.debug('[MSG91-Widget] derived reqId', derivedReqId); } catch(_) {}
              window.__MSG91_LAST_REQ_ID = derivedReqId;
            }
            window.__MSG91_LAST_SEND__ = { data, reqId: derivedReqId, at: Date.now() };
            resolve({ data, reqId: derivedReqId });
          },
          function(err){
            try { console.debug('[MSG91-Widget] sendOtp failure', err); } catch(_) {}
            window.__MSG91_LAST_SEND__ = { error: err, at: Date.now() };
            reject(err);
          },
          reqId
        );
      } catch (e) { reject(e); }
    });
  }

  function widgetRetryOtp(channel, reqId) {
    return new Promise((resolve, reject) => {
      if (!window.retryOtp) return reject(new Error('MSG91 retryOtp not available'));
      try {
        try { console.debug('[MSG91-Widget] retryOtp request', { channel, reqId }); } catch(_) {}
        window.retryOtp(channel ?? null, function(data){ try { console.debug('[MSG91-Widget] retryOtp success', data); } catch(_) {} window.__MSG91_LAST_RETRY__ = { data, at: Date.now() }; resolve(data); }, function(err){ try { console.debug('[MSG91-Widget] retryOtp failure', err); } catch(_) {} window.__MSG91_LAST_RETRY__ = { error: err, at: Date.now() }; reject(err); }, reqId);
      } catch (e) { reject(e); }
    });
  }

  function widgetVerifyOtp(otp, reqId) {
    return new Promise((resolve, reject) => {
      if (!window.verifyOtp) return reject(new Error('MSG91 verifyOtp not available'));
      try {
        const rid = reqId || window.__MSG91_LAST_REQ_ID;
        try { console.debug('[MSG91-Widget] verifyOtp request', { otp: String(otp).replace(/\d/g,'*'), reqId: rid }); } catch(_) {}
        window.verifyOtp(
          otp,
          function(data){ try { console.debug('[MSG91-Widget] verifyOtp success', data); } catch(_) {} window.__MSG91_LAST_VERIFY__ = { data, at: Date.now(), reqId: rid }; resolve(data); },
          function(err){ try { console.debug('[MSG91-Widget] verifyOtp failure', err); } catch(_) {} window.__MSG91_LAST_VERIFY__ = { error: err, at: Date.now(), reqId: rid }; reject(err); },
          rid
        );
      } catch (e) { reject(e); }
    });
  }

  // Expose helpers on window
  window.configureMsg91Widget = configureMsg91Widget;
  window.widgetSendOtp = widgetSendOtp;
  window.widgetRetryOtp = widgetRetryOtp;
  window.widgetVerifyOtp = widgetVerifyOtp;
})();
