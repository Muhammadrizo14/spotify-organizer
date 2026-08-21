import { NextResponse } from "next/server";
import { previewModeResponse } from "@/lib/preview-guard";
import { getSpotifyClientId, getSpotifyRedirectUri } from "@/lib/spotify-server";

export async function GET() {
  const blocked = previewModeResponse();
  if (blocked) return blocked;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getSpotifyClientId(),
    scope:
      "user-read-private user-read-email " +
      "playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public " +
      "ugc-image-upload user-library-read",
    redirect_uri: getSpotifyRedirectUri(),
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
