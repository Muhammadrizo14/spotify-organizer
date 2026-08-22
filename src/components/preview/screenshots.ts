/**
 * The screenshots shown on the preview page.
 *
 * Files live in `public/screenshots/`. To refresh them, run the app locally
 * with NEXT_PUBLIC_APP_MODE=development, take a screenshot of the page and
 * drop it in that folder, then add or update an entry here.
 *
 * Only the file metadata lives here — the caption and description are copy,
 * so they live per language in `i18n.ts` under the same `id`.
 */

export type PreviewScreenshotId = "create-ai" | "create-filters";

export interface PreviewScreenshot {
  /** Key into `PreviewCopy["screenshots"]` for the caption and description. */
  id: PreviewScreenshotId;
  /** Path under `public/`. */
  src: string;
  /** Intrinsic size of the file, used to reserve layout space. */
  width: number;
  height: number;
}

export const PREVIEW_SCREENSHOTS: PreviewScreenshot[] = [
  {
    id: "create-ai",
    src: "/screenshots/create-ai.png",
    width: 1280,
    height: 620,
  },
  {
    id: "create-filters",
    src: "/screenshots/create-filters.png",
    width: 1280,
    height: 940,
  },
];
