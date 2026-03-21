import axios from "axios";
import { TokenIssueResponse } from "@/app/callback/_lib/types";

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const EXPIRY_KEY = "token_expiry";

// Returns a valid access token, refreshing it if it's expired or about to expire.
export async function getValidToken(): Promise<string | null> {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (!accessToken || !refreshToken) return null;

  // Refresh if within 5 minutes of expiry (or already expired)
  const expiryTime = expiry ? parseInt(expiry, 10) : 0;
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = !expiry || Date.now() >= expiryTime - fiveMinutes;

  if (!needsRefresh) return accessToken;

  try {
    const credentials = btoa(
      `${process.env.NEXT_PUBLIC_CLIENT_ID}:${process.env.NEXT_PUBLIC_CLIENT_SECRET}`
    );

    const res = await axios<TokenIssueResponse>(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        data: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = res.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expires_in * 1000));

    // Spotify may rotate the refresh token
    if (refresh_token) {
      localStorage.setItem(REFRESH_KEY, refresh_token);
    }

    return access_token;
  } catch {
    // Refresh failed — clear tokens so the user is prompted to log in again
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
}

export function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}
