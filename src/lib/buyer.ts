import { useEffect, useSyncExternalStore } from "react";
import { api, type Buyer } from "@/lib/api";
import { getAnonId, refreshSaved } from "@/lib/saved";

/** The signed-in buyer (phone OTP account), shared across the app. */
interface BuyerState {
  buyer: Buyer | null;
  loaded: boolean;
  loginOpen: boolean;
  loginReason?: string;
}

let state: BuyerState = { buyer: null, loaded: false, loginOpen: false };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<BuyerState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function refreshBuyer(): Promise<void> {
  if (!loading) {
    loading = api
      .buyerMe()
      .then((r) => setState({ buyer: r.buyer, loaded: true }))
      .catch(() => setState({ loaded: true }))
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export async function completeBuyerLogin(payload: { accessToken: string; phone: string; name?: string }) {
  const { buyer, merged } = await api.buyerWidgetLogin(getAnonId(), payload);
  setState({ buyer, loaded: true, loginOpen: false });
  await refreshSaved();
  return { buyer, merged };
}

export async function updateBuyer(payload: { name?: string; email?: string }) {
  const { buyer } = await api.buyerUpdate(payload);
  setState({ buyer });
  return buyer;
}

export async function logoutBuyer() {
  await api.buyerLogout().catch(() => undefined);
  setState({ buyer: null });
  await refreshSaved();
}

/** Opens the sign-in dialog from anywhere; `reason` is a short line shown at the top. */
export function openBuyerLogin(reason?: string) {
  setState({ loginOpen: true, loginReason: reason });
}

export function closeBuyerLogin() {
  setState({ loginOpen: false });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useBuyerState(): BuyerState {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    if (!state.loaded) refreshBuyer();
  }, []);
  return s;
}

export function useBuyer(): Buyer | null {
  return useBuyerState().buyer;
}
