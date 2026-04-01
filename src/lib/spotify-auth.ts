/**
 * spotify-auth.ts — Token management for Spotify API access.
 *
 * FLOW OVERVIEW:
 * 1. User logs in via OAuth → callback page calls saveTokens() to store tokens in localStorage.
 * 2. Every API call goes through getValidToken() which:
 *    a) Reads the access token from localStorage
 *    b) Checks if it's about to expire (within 5 minutes)
 *    c) If yes → calls the app's refresh route, which talks to Spotify server-side
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
const EXPIRY_KEY = "token_expiry";

/**
 * Returns a valid Spotify access token, automatically refreshing if needed.
 */
export async function getValidToken(): Promise<string | null> {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (!accessToken || !refreshToken) return null;

  const expiryTime = expiry ? parseInt(expiry, 10) : 0;
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = !expiry || Date.now() >= expiryTime - fiveMinutes;

  if (!needsRefresh) return accessToken;

  try {
    const res = await axios.post<TokenIssueResponse>("/api/spotify/refresh", {
      refreshToken,
    });

    const { access_token, refresh_token, expires_in } = res.data;

    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expires_in * 1000));

    if (refresh_token) {
      localStorage.setItem(REFRESH_KEY, refresh_token);
    }

    return access_token;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
}

/**
 * Saves tokens to localStorage after a successful OAuth callback.
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
