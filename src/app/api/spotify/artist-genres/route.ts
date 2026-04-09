import { NextRequest, NextResponse } from "next/server";
import { requestSpotifyToken } from "@/lib/spotify-server";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

// Simple in-memory cache: the client credentials token is valid for 1 hour.
// Reusing it avoids a token round-trip on every request.
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const token = await requestSpotifyToken(
    new URLSearchParams({ grant_type: "client_credentials" }),
  );

  cachedToken = token.access_token;
  // Subtract 60 s so we refresh slightly before expiry
  tokenExpiry = Date.now() + token.expires_in * 1000 - 60_000;
  return cachedToken;
}

/**
 * POST /api/spotify/artist-genres
 * Body: { ids: string[] }   — up to any number of Spotify artist IDs
 *
 * Returns: { [artistId]: string[] }  — map of artistId → genre array
 *
 * Uses the Client Credentials (app-level) token so it never depends on the
 * logged-in user's OAuth token, which caused 403s when called from the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids ?? [];

    if (ids.length === 0) {
      return NextResponse.json({});
    }

    const token = await getAppToken();
    const result: Record<string, string[]> = {};
    const BATCH = 50;

    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH).join(",");
      const res = await fetch(`${SPOTIFY_BASE}/artists?ids=${chunk}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn(`/v1/artists batch ${i}–${i + BATCH} failed: ${res.status}`);
        continue;
      }

      const data = (await res.json()) as {
        artists: { id: string; genres: string[] }[];
      };

      for (const artist of data.artists) {
        if (artist) result[artist.id] = artist.genres;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch artist genres.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
