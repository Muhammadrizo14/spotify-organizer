import { NextResponse } from "next/server";
import { isPreviewMode } from "@/lib/app-mode";

/**
 * Returns a 403 response when the app is running as a preview, otherwise null.
 *
 * Hiding the UI is not enough: the routes below would still let anyone with
 * the URL drive a real Spotify account from the hosted deployment. Every route
 * that reaches Spotify or the LLM starts with this guard so the preview build
 * has no working backend at all.
 *
 *   const blocked = previewModeResponse();
 *   if (blocked) return blocked;
 */
export function previewModeResponse(): NextResponse | null {
  if (!isPreviewMode) return null;

  return NextResponse.json(
    {
      error:
        "This deployment is preview-only. Spotify's Developer Policy does not " +
        "allow a hosted third-party service to organize a user's library, so " +
        "the Spotify integration is disabled here. Run the project locally " +
        "with NEXT_PUBLIC_APP_MODE=development to use it.",
    },
    { status: 403 },
  );
}
