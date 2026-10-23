import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Heart, Loader2, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeBuyerLogin, completeBuyerLogin, useBuyerState } from "@/lib/buyer";
import { formatPhone, isValidIndianMobile, resendPhoneOtp, sendPhoneOtp, toMsisdn, verifyPhoneOtp } from "@/lib/otpWidget";

const RESEND_SECONDS = 30;

/** Phone OTP sign-in for buyers. Mounted once in App; opened with openBuyerLogin(). */
const BuyerLoginDialog = () => {
  const { loginOpen, loginReason } = useBuyerState();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Fresh form each time it opens
  useEffect(() => {
    if (loginOpen) {
      setStep("phone");
      setCode("");
      setError("");
      setBusy(false);
    }
  }, [loginOpen]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") setTimeout(() => codeRef.current?.focus(), 50);
  }, [step]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!isValidIndianMobile(phone)) {
      setError("Enter your 10-digit mobile number");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await sendPhoneOtp(phone);
      setStep("code");
      setCode("");
      setResendIn(RESEND_SECONDS);
    } catch (err: any) {
      setError(err?.message || "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || resendIn > 0) return;
    setBusy(true);
    setError("");
    try {
      await resendPhoneOtp();
      setResendIn(RESEND_SECONDS);
      toast.success("A new code is on its way");
    } catch (err: any) {
      setError(err?.message || "Couldn't resend the code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const digits = code.replace(/\D/g, "");
    if (digits.length < 4) {
      setError("Enter the code from the SMS");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const accessToken = await verifyPhoneOtp(digits);
      const { buyer, merged } = await completeBuyerLogin({ accessToken, phone: toMsisdn(phone), name: name.trim() || undefined });
      const first = buyer.name?.split(" ")[0];
      toast.success(first ? `Welcome, ${first}!` : "You're signed in", {
        description: merged
          ? `${merged} saved project${merged === 1 ? " is" : "s are"} now on your account.`
          : "Projects you save will be on your account on any device.",
      });
    } catch (err: any) {
      setError(err?.message || "That code didn't work");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={loginOpen} onOpenChange={(open) => !open && !busy && closeBuyerLogin()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {step === "phone" ? <Heart className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center">{step === "phone" ? "Sign in with your phone" : "Enter the code"}</DialogTitle>
          <DialogDescription className="text-center">
            {step === "phone"
              ? loginReason || "Keep your saved projects on every device. No password needed: we'll text you a code."
              : `We sent a code by SMS to ${formatPhone(toMsisdn(phone))}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyer-phone">Mobile number</Label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">+91</span>
                <Input
                  id="buyer-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  maxLength={14}
                  className="rounded-l-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer-name">Your name (optional)</Label>
              <Input id="buyer-name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send code
            </Button>
            <p className="text-center text-xs text-muted-foreground">We'll only use your number for your account and replies to your enquiries.</p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyer-code">Code</Label>
              <Input
                id="buyer-code"
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                maxLength={8}
                className="text-center text-2xl tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify and sign in
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setStep("phone")} disabled={busy}>
                Change number
              </button>
              <button
                type="button"
                className="text-primary disabled:text-muted-foreground"
                onClick={resend}
                disabled={busy || resendIn > 0}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BuyerLoginDialog;
