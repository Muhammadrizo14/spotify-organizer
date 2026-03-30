/**
 * spotify-auth.ts — Token management for Spotify API access.
 *
 * FLOW OVERVIEW:
 * 1. User logs in via OAuth → callback page calls saveTokens() to store tokens in localStorage.
 * 2. Every API call goes through getValidToken() which:
 *    a) Reads the access token from localStorage
 *    b) Checks if it's about to expire (within 5 minutes)
 *    c) If yes → uses the refresh token to get a new access token from Spotify
 *    d) If refresh fails → clears all tokens (user must log in again)
 *    e) Returns the valid access token, or null if not authenticated
 *
 * IMPORTANT: Tokens are stored in localStorage (client-side only).
 * This means getValidToken() can only be called from client components ("use client").
 */

import axios from "axios";
import { TokenIssueResponse } from "@/app/callback/_lib/types";

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const EXPIRY_KEY = "token_expiry";    // stored as Unix timestamp in milliseconds (Date.now() + expires_in * 1000)

/**
 * Returns a valid Spotify access token, automatically refreshing if needed.
 *
 * @returns The access token string, or null if the user is not logged in
 *          or if the refresh failed (tokens are cleared in that case).
 */
export async function getValidToken(): Promise<string | null> {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  // No tokens at all → user never logged in or tokens were cleared after a failed refresh
  if (!accessToken || !refreshToken) return null;

  // Check if token is still valid (with 5-minute buffer to avoid mid-request expiry)
  const expiryTime = expiry ? parseInt(expiry, 10) : 0;
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = !expiry || Date.now() >= expiryTime - fiveMinutes;

  // Token is still fresh — return it as-is
  if (!needsRefresh) return accessToken;

  // Token is expired or about to expire — refresh it using the refresh token
  try {
    // Build Basic auth header: base64(client_id:client_secret)
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

    // Save the new access token and its expiry time
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expires_in * 1000));

    // Spotify may rotate the refresh token — if a new one is returned, save it
    if (refresh_token) {
      localStorage.setItem(REFRESH_KEY, refresh_token);
    }

    return access_token;
  } catch {
    // Refresh failed (e.g. refresh token revoked, user changed password)
    // Clear everything so the app shows the login screen
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
}

/**
 * Saves tokens to localStorage after a successful OAuth callback.
 * Called from the /callback page after exchanging the auth code for tokens.
 */
export function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}
