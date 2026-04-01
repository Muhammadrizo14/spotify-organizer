import { NextRequest, NextResponse } from "next/server";
import { requestSpotifyToken } from "@/lib/spotify-server";

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = (await request.json()) as { refreshToken?: string };

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refresh token." },
        { status: 400 }
      );
    }

    const token = await requestSpotifyToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      })
    );

    return NextResponse.json(token);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token refresh failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
