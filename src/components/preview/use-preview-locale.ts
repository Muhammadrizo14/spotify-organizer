"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_PREVIEW_LOCALE,
  resolvePreviewLocale,
  type PreviewLocale,
} from "./i18n";

const STORAGE_KEY = "preview-locale";

/**
 * The chosen language lives in localStorage rather than in React state, so it
 * survives a reload and stays in step across tabs. `useSyncExternalStore`
 * subscribes to it: the server (and the hydrating render) sees the default,
 * then React swaps in the stored value once it can read the browser.
 */
const listeners = new Set<() => void>();

/** Holds the choice when the browser refuses to store it (private mode). */
let fallbackLocale: PreviewLocale | null = null;

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);
  // Fires when another tab writes the key; same-tab writes go through emit().
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

// Returns a string, so React's snapshot comparison is a plain value check and
// cannot loop. With nothing stored yet, the browser's own language decides.
const getSnapshot = (): PreviewLocale => {
  try {
    const stored = resolvePreviewLocale(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Storage is blocked — fall through to the in-memory choice.
  }
  return (
    fallbackLocale ??
    resolvePreviewLocale(navigator.language) ??
    DEFAULT_PREVIEW_LOCALE
  );
};

const getServerSnapshot = (): PreviewLocale => DEFAULT_PREVIEW_LOCALE;

/** Reads the visitor's preview language and remembers a new choice. */
export const usePreviewLocale = (): [
  PreviewLocale,
  (locale: PreviewLocale) => void,
] => {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setLocale = useCallback((next: PreviewLocale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      fallbackLocale = null;
    } catch {
      // Blocked: the switch still works, it just will not outlive the tab.
      fallbackLocale = next;
    }
    emit();
  }, []);

  return [locale, setLocale];
};
