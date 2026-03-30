/**
 * spotify-tracks.service.ts — Finds tracks and adds them to a playlist.
 *
 * OVERALL FLOW (called from form.tsx → onSubmit):
 * 1. buildTrackList() is the main entry point
 * 2. It decides whether to use only search results or mix in saved/liked songs
 * 3. searchTracks() queries Spotify's search API with genre/mood/era combinations
 * 4. getSavedTracks() fetches the user's liked songs from their library
 * 5. addTracksToPlaylist() sends the final track URIs to the created playlist
 *
 * DEBUGGING TIPS:
 * - If you get "Your session has expired" → the Spotify token is invalid, user needs to log in again
 * - If you get "No tracks found" → the search queries returned 0 results, try different prompt keywords
 * - If you get 403 on addTracks → check that the playlist is owned by the logged-in user
 * - Open browser DevTools console to see `console.warn` for individual failed search queries
 */

import axios from "axios";
import { getValidToken } from "@/lib/spotify-auth";
import {
  ParsedPromptSettings,
  SpotifySearchResponse,
  SpotifyLibraryResponse,
} from "@/types/playlist";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

/**
 * Maps decade labels (from the LLM) to Spotify search year ranges.
 * Used in search queries like: "rock year:1980-1989"
 * NOTE: Only decades listed here are supported. If the LLM returns "1950s",
 * it won't match and that era will be skipped (no year filter for that query).
 */
const ERA_YEAR_RANGES: Record<string, string> = {
  "1960s": "1960-1969",
  "1970s": "1970-1979",
  "1980s": "1980-1989",
  "1990s": "1990-1999",
  "2000s": "2000-2009",
  "2010s": "2010-2019",
  "2020s": "2020-2029",
};

/**
 * Builds an array of Spotify search query strings from the parsed prompt settings.
 * Multiple queries are used to get diverse results (different angles on the same request).
 *
 * For genres: ["rock", "blues"] and mood: "energetic", era: ["1980s"], this produces:
 *   - "genre:rock energetic"          (Spotify genre filter + mood keyword)
 *   - "rock energetic"                (plain text search with mood)
 *   - "genre:blues energetic"
 *   - "blues energetic"
 *   - "rock year:1980-1989"           (genre + era year range)
 *   - "blues year:1980-1989"
 *
 * @param settings - The parsed prompt settings from the Groq LLM
 * @returns Array of search query strings to send to Spotify's /v1/search endpoint
 */
function buildSearchQueries(settings: ParsedPromptSettings): string[] {
  const queries: string[] = [];

  // For each genre, create two queries: one with genre: filter, one as plain text
  // Plain text helps because Spotify's genre: filter can be restrictive
  for (const genre of settings.genres) {
    const genreLabel = genre.replace(/-/g, " ");     // "alt-rock" → "alt rock"
    queries.push(`genre:${genre} ${settings.mood}`);  // e.g. "genre:rock energetic"
    queries.push(`${genreLabel} ${settings.mood}`);   // e.g. "rock energetic"
  }

  // Add era-based queries to get tracks from specific decades
  // Limited to first 2 genres x first 2 eras to avoid too many queries
  if (settings.era.length > 0) {
    for (const genre of settings.genres.slice(0, 2)) {
      const genreLabel = genre.replace(/-/g, " ");
      for (const era of settings.era.slice(0, 2)) {
        const yearRange = ERA_YEAR_RANGES[era];
        if (yearRange) {
          queries.push(`${genreLabel} year:${yearRange}`);  // e.g. "rock year:1980-1989"
        }
      }
    }
  }

  return queries;
}

/**
 * Searches Spotify for tracks matching the parsed prompt settings.
 *
 * HOW IT WORKS:
 * 1. Builds multiple search queries from genres/mood/era (see buildSearchQueries)
 * 2. Fires each query against Spotify's /v1/search endpoint
 * 3. Collects all unique track URIs in a Set (deduplicates across queries)
 * 4. Stops early once we have enough tracks
 * 5. Shuffles results so tracks from different queries are mixed together
 *
 * POTENTIAL ISSUES:
 * - If the Spotify token is expired, ALL queries will fail with 401 → throws "session expired"
 * - If queries return overlapping results, the Set deduplicates them.
 *   We over-fetch (limit * 2 / queries) to compensate, but may still get fewer than requested.
 * - Individual query failures (e.g. bad query syntax) are caught and logged, not fatal.
 *
 * @param settings - Parsed prompt settings (genres, mood, era, etc.)
 * @param limit - How many track URIs to return (default 30)
 * @returns Array of Spotify track URI strings, e.g. ["spotify:track:abc123", ...]
 * @throws Error if token is invalid/expired or if 0 tracks were found across all queries
 */
export async function searchTracks(
  settings: ParsedPromptSettings,
  limit: number = 30
): Promise<string[]> {

  // Get a valid Spotify access token (auto-refreshes if needed)
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const queries = buildSearchQueries(settings);

  // Calculate how many tracks to request per query.
  // We request 2x the limit divided by number of queries to account for
  // duplicate tracks that appear across multiple queries (the Set deduplicates them).
  // Minimum 10 per query, maximum 50 (Spotify's limit per request).
  const perQuery = Math.max(10, Math.ceil((limit * 2) / queries.length));


  // Set automatically deduplicates — same track from two queries is stored once
  const allUris = new Set<string>();

  for (const query of queries) {
    // Stop early if we already have enough unique tracks
    if (allUris.size >= limit) break;

    try {
      const params = new URLSearchParams({
        q: query,
        type: "track",
        limit: String(Math.min(perQuery, 50)),  // Spotify max is 50 per request
      });

      const { data } = await axios.get<SpotifySearchResponse>(
        `${SPOTIFY_BASE}/search?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add each track's URI to the set
      for (const track of data.tracks.items) {
        allUris.add(track.uri);
      }
    } catch (err) {
      // 401 means the token is invalid — no point continuing with other queries
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      // Other errors (e.g. bad query syntax, rate limit) — log and try next query
      console.warn(`Search query "${query}" failed:`, err);
    }
  }

  // If ALL queries returned 0 results, the prompt probably doesn't match any music
  if (allUris.size === 0) {
    throw new Error(
      "No tracks found for your prompt. Try different keywords or genres."
    );
  }

  // Shuffle results so tracks from different queries are interleaved (Fisher-Yates shuffle)
  const uris = [...allUris];
  for (let i = uris.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uris[i], uris[j]] = [uris[j], uris[i]];
  }

  // Return only the requested number of tracks
  return uris.slice(0, limit);
}

/**
 * Fetches the user's saved/liked songs from their Spotify library.
 * Used when "Include my saved music" is toggled on.
 *
 * Spotify paginates results (max 50 per page), so this loops through pages
 * until we have enough tracks or there are no more pages.
 *
 * @param limit - Maximum number of saved track URIs to return
 * @returns Array of track URIs from the user's library
 * @throws Error if not authenticated or if token is expired (401)
 */
export async function getSavedTracks(limit: number = 50): Promise<string[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const uris: string[] = [];
  // Start with the first page; Spotify returns a `next` URL for pagination
  let url: string | null = `${SPOTIFY_BASE}/me/tracks?limit=${Math.min(limit, 50)}`;

  while (url && uris.length < limit) {
    try {
      const response = await axios.get<SpotifyLibraryResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const page: SpotifyLibraryResponse = response.data;
      for (const item of page.items) {
        uris.push(item.track.uri);
      }
      // `page.next` is the URL for the next page, or null if this was the last page
      url = page.next;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      throw err;
    }
  }

  return uris.slice(0, limit);
}

/**
 * Adds tracks to an existing Spotify playlist.
 *
 * Spotify limits adding 100 tracks per request, so this batches them
 * in chunks of 100.
 *
 * @param playlistId - The Spotify playlist ID to add tracks to
 * @param trackUris - Array of track URIs, e.g. ["spotify:track:abc123", ...]
 * @throws Error if not authenticated, if playlist permissions are wrong (403),
 *         or if Spotify rejects the request
 */
export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  // Spotify allows max 100 URIs per request, so batch if needed
  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    try {
      await axios.post(
        `${SPOTIFY_BASE}/playlists/${playlistId}/items`,
        { uris: batch },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      // 403 = user doesn't own the playlist or lacks the right scopes
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        throw new Error(
          "Spotify returned 403 Forbidden while adding tracks. Make sure you're logged in with `playlist-modify-public`/`playlist-modify-private` scopes and that the playlist is owned by your account (or is collaborative)."
        );
      }
      throw err;
    }
  }
}

/**
 * Main entry point: builds the final list of track URIs for a new playlist.
 *
 * TWO MODES:
 * 1. includeSavedMusic = false → all tracks come from Spotify search
 * 2. includeSavedMusic = true  → 60% from user's liked songs, 40% from search
 *    - Saved tracks are shuffled randomly so the playlist isn't just the most recent likes
 *    - Duplicates between saved and searched tracks are removed
 *    - Over-fetches saved tracks (3x needed) so we have enough after dedup + shuffle
 *
 * @param settings - Parsed prompt settings from the LLM
 * @param includeSavedMusic - Whether to mix in the user's liked songs
 * @param totalTracks - Desired total number of tracks in the playlist
 * @returns Array of unique track URIs
 */
export async function buildTrackList(
  settings: ParsedPromptSettings,
  includeSavedMusic: boolean,
  totalTracks: number = 30
): Promise<string[]> {
  // Simple mode: all tracks from search
  if (!includeSavedMusic) {
    return searchTracks(settings, totalTracks);
  }

  // Mixed mode: 60% saved songs, 40% new from search
  const savedCount = Math.round(totalTracks * 0.6);
  const newCount = totalTracks - savedCount;

  // Fetch both in parallel for speed
  const [saved, searched] = await Promise.all([
    getSavedTracks(savedCount * 3),          // over-fetch 3x to have enough after shuffle + dedup
    searchTracks(settings, newCount),
  ]);

  // Remove any saved tracks that also appear in search results (avoid duplicates)
  const searchedSet = new Set(searched);
  const dedupedSaved = saved
    .sort(() => Math.random() - 0.5)           // shuffle saved tracks randomly
    .filter((uri) => !searchedSet.has(uri))    // remove duplicates
    .slice(0, savedCount);                     // take only what we need

  // Combine and trim to exact count
  const combined = [...dedupedSaved, ...searched];
  return combined.slice(0, totalTracks);
}
