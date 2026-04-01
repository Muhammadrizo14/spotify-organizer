import { TokenIssueErrorResponse, TokenIssueResponse } from "@/app/callback/_lib/types";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

function getRequiredEnv(name: "NEXT_PUBLIC_CLIENT_ID" | "SPOTIFY_CLIENT_SECRET"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSpotifyRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APP_URL");
  }

  return `${appUrl}/callback`;
}

export function getSpotifyClientId(): string {
  return getRequiredEnv("NEXT_PUBLIC_CLIENT_ID");
}

function getSpotifyClientSecret(): string {
  return getRequiredEnv("SPOTIFY_CLIENT_SECRET");
}

function getSpotifyBasicAuthHeader(): string {
  const credentials = `${getSpotifyClientId()}:${getSpotifyClientSecret()}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function requestSpotifyToken(
  params: URLSearchParams
): Promise<TokenIssueResponse> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getSpotifyBasicAuthHeader(),
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as TokenIssueErrorResponse | null;
    const message = errorData?.error_description ?? errorData?.error ?? "Spotify authentication failed.";
    throw new Error(message);
  }

  return response.json() as Promise<TokenIssueResponse>;
}
