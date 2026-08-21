/**
 * app-mode.ts — Decides whether the app runs for real or only shows a preview.
 *
 * Spotify's Developer Policy does not let this kind of app organize a user's
 * library from a publicly hosted third-party service, so the deployed build
 * ships as a read-only preview (screenshots + explanation) while the local
 * build stays fully usable.
 *
 * The mode comes from NEXT_PUBLIC_APP_MODE and falls back to NODE_ENV:
 *   "development" → the real app (login, playlist creation, Spotify calls)
 *   anything else → preview only
 *
 * NEXT_PUBLIC_* is inlined at build time, so the same constant is correct on
 * the server and in the browser bundle. Unset means preview, which is the safe
 * default for any deployment that forgets to configure it.
 */

export type AppMode = "development" | "production";

export const APP_MODE: AppMode =
  (process.env.NEXT_PUBLIC_APP_MODE ?? process.env.NODE_ENV) === "development"
    ? "development"
    : "production";

/** True when only the preview may be rendered and the Spotify routes are off. */
export const isPreviewMode = APP_MODE === "production";
