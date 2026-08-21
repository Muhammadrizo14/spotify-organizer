/**
 * The screenshots shown on the preview page.
 *
 * Files live in `public/screenshots/`. To refresh them, run the app locally
 * with NEXT_PUBLIC_APP_MODE=development, take a screenshot of the page and
 * drop it in that folder, then add or update an entry here.
 */

export interface PreviewScreenshot {
  /** Path under `public/`. */
  src: string;
  /** Rendered as the caption under the image, and as the alt text. */
  title: string;
  description: string;
  /** Intrinsic size of the file, used to reserve layout space. */
  width: number;
  height: number;
}

export const PREVIEW_SCREENSHOTS: PreviewScreenshot[] = [
  {
    src: "/screenshots/create-ai.png",
    title: "Describe a playlist in plain language",
    description:
      "The AI tab turns a prompt like \"chill lo-fi beats for late night coding\" into concrete genres, era and energy settings, then builds the playlist from Spotify search or from your saved songs.",
    width: 1280,
    height: 620,
  },
  {
    src: "/screenshots/create-filters.png",
    title: "Or set the filters yourself",
    description:
      "Custom Filters exposes the same engine directly: up to five genres, mood, decades, tempo, energy and track count — no prompt in the middle.",
    width: 1280,
    height: 940,
  },
];
