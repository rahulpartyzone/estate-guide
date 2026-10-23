import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";

/**
 * Saved projects for visitors without an account. A random id in localStorage identifies the
 * browser to the API (X-Anon-Id); the list itself lives in the database, so it survives reloads.
 */
const ANON_KEY = "eg.anonId";
const CACHE_KEY = "eg.savedIds";

let savedIds: string[] = readCache();
let loaded = false;
const listeners = new Set<() => void>();

function readCache(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setIds(next: string[]) {
  savedIds = next;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep in memory only */
  }
  listeners.forEach((l) => l());
}

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : fallbackUuid();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return fallbackUuid();
  }
}

function fallbackUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function refreshSaved() {
  try {
    const { propertyIds } = await api.getWishlist(getAnonId());
    loaded = true;
    setIds(propertyIds || []);
  } catch {
    /* offline or API down: keep the cached list */
  }
}

/** Toggles a project; returns true when it is now saved. Rolls back if the API call fails. */
export async function toggleSaved(propertyId: string): Promise<boolean> {
  const wasSaved = savedIds.includes(propertyId);
  const previous = savedIds;
  setIds(wasSaved ? savedIds.filter((id) => id !== propertyId) : [propertyId, ...savedIds]);
  try {
    if (wasSaved) await api.removeFromWishlist(getAnonId(), propertyId);
    else await api.addToWishlist(getAnonId(), propertyId);
    return !wasSaved;
  } catch (e) {
    setIds(previous);
    throw e;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSavedIds(): string[] {
  const ids = useSyncExternalStore(subscribe, () => savedIds, () => savedIds);
  useEffect(() => {
    if (!loaded) refreshSaved();
  }, []);
  return ids;
}
