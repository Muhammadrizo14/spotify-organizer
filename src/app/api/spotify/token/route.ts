import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyRedirectUri,
  requestSpotifyToken,
} from "@/lib/spotify-server";

export async function POST(request: NextRequest) {
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
        redirect_uri: "http://127.0.0.1:3000/callback",
        // Note: I am not using the following below code because http://127.0.0.1:3000/callback was configrued
        // as a redirect_uri yet the request.nextUrl.origin is not seing the url http://127.0.0.1:3000
        // its just making it (request.nextUrl.origin) as localhost
        // https://github.com/vercel/next.js/issues/31533

        // redirect_uri: getSpotifyRedirectUri(request.nextUrl.origin),
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
