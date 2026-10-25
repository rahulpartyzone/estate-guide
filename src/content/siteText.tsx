import { createElement, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { api } from "@/lib/api";
import { TEXT_FIELDS } from "./catalog";

/**
 * Admin-edited labels for the public site. The default wording is in catalog.ts; this holds only the
 * changes (from GET /site-text), cached in the browser so returning visitors don't see the defaults flash.
 */
export type TextOverride = { value?: string; hidden?: boolean };
export type TextOverrides = Record<string, TextOverride>;
type Vars = Record<string, string | number | null | undefined>;

const CACHE_KEY = "eg.siteText";
let overrides: TextOverrides = readCache();
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function readCache(): TextOverrides {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TextOverrides) : {};
  } catch {
    return {};
  }
}

export function setSiteTextOverrides(next: TextOverrides) {
  overrides = next || {};
  loaded = true;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(overrides));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function loadSiteText(): Promise<void> {
  if (!loading) {
    loading = api
      .getSiteText()
      .then((map) => setSiteTextOverrides(map || {}))
      .catch(() => {
        loaded = true;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

function fill(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const v = vars[name];
    return v === null || v === undefined ? "" : String(v);
  });
}

function rawText(key: string): string {
  const field = TEXT_FIELDS.get(key);
  if (!field) {
    if (import.meta.env.DEV) console.warn(`[site text] unknown key: ${key}`);
    return key;
  }
  const o = overrides[key];
  if (o?.hidden && !field.required) return "";
  return o?.value !== undefined && o.value !== null && o.value !== "" ? o.value : field.default;
}

/** A label with {placeholders} filled in; "" when the admin hid it. Usable outside components (toasts). */
export function text(key: string, vars?: Vars): string {
  return fill(rawText(key), vars);
}

/** False when the admin hid the label (or it's empty). */
export function shown(key: string): boolean {
  return rawText(key).trim() !== "";
}

/** A label that lists options, one per line. */
export function lines(key: string): string[] {
  return rawText(key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-renders the component when labels change. */
export function useText() {
  const version = useSyncExternalStore(subscribe, () => overrides, () => overrides);
  useEffect(() => {
    if (!loaded) loadSiteText();
  }, []);
  /** `version` changes whenever labels change; add it to useMemo deps that use t() */
  return { t: text, show: shown, lines, version };
}

type TxtProps = {
  k: string;
  vars?: Vars;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** Rendered before the text (an icon, say), only when the label is shown */
  before?: ReactNode;
  after?: ReactNode;
};

/** Renders a label in the given element, or nothing at all when the admin hid it. */
export function Txt({ k, vars, as = "span", className, before, after }: TxtProps) {
  useText();
  if (!shown(k)) return null;
  return createElement(as, { className }, before, text(k, vars), after);
}
