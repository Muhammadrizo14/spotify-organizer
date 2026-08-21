import { NextRequest, NextResponse } from "next/server";
import { previewModeResponse } from "@/lib/preview-guard";
import {
  getSpotifyRedirectUri,
  requestSpotifyToken,
} from "@/lib/spotify-server";

export async function POST(request: NextRequest) {
  const blocked = previewModeResponse();
  if (blocked) return blocked;

  try {
    const { code } = (await request.json()) as { code?: string };

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code." },
        { status: 400 },
      );
    }

    const token = await requestSpotifyToken(
      new URLSearchParams({
        code,
        redirect_uri: getSpotifyRedirectUri(),
        grant_type: "authorization_code",
      }),
    );

    return NextResponse.json(token);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
