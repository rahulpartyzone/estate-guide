import { useSyncExternalStore } from "react";
import { toast } from "sonner";

/** Up to 3 projects picked for side-by-side comparison, kept on this device. */
export const MAX_COMPARE = 3;
const KEY = "eg.compareIds";

let ids: string[] = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
})();
const listeners = new Set<() => void>();

function set(next: string[]) {
  ids = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* in memory only */
  }
  listeners.forEach((l) => l());
}

export function toggleCompare(id: string) {
  if (ids.includes(id)) return set(ids.filter((x) => x !== id));
  if (ids.length >= MAX_COMPARE) {
    toast.error(`You can compare up to ${MAX_COMPARE} projects. Remove one first.`);
    return;
  }
  set([...ids, id]);
}

export const clearCompare = () => set([]);
export const removeFromCompare = (id: string) => set(ids.filter((x) => x !== id));

export function useCompareIds(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ids,
    () => ids,
  );
}
