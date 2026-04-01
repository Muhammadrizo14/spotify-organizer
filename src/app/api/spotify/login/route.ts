import { NextRequest, NextResponse } from "next/server";
import { getSpotifyClientId, getSpotifyRedirectUri } from "@/lib/spotify-server";

export async function GET(request: NextRequest) {
  console.log(request, request.nextUrl)

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getSpotifyClientId(),
    scope:
      "user-read-private user-read-email " +
      "playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public " +
      "ugc-image-upload user-library-read",
    redirect_uri: 'http://127.0.0.1:3000/callback'
    // Note: I am not using the following below code because http://127.0.0.1:3000/callback was configrued
    // as a redirect_uri yet the request.nextUrl.origin is not seing the url http://127.0.0.1:3000
    // its just making it (request.nextUrl.origin) as localhost
    // https://github.com/vercel/next.js/issues/31533

    // redirect_uri: getSpotifyRedirectUri(request.nextUrl.origin),
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
