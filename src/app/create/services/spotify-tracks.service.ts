/**
 * spotify-tracks.service.ts — Finds tracks and adds them to a playlist.
 *
 * OVERALL FLOW (called from form.tsx → onSubmit):
 * 1. buildTrackList() is the main entry point
 * 2. It decides whether to use only search results or the user's saved library
 * 3. searchTracks() queries Spotify's search API with genre/mood/era combinations
 * 4. fetchAllSavedTracks() paginates through ALL of the user's liked songs
 * 5. filterSavedTracksBySettings() narrows them to genre/era matches
 * 6. addTracksToPlaylist() sends the final track URIs to the created playlist
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
  SpotifyTrack,
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
    const genreLabel = genre.replace(/-/g, " "); // "alt-rock" → "alt rock"
    queries.push(`genre:${genre} ${settings.mood}`); // e.g. "genre:rock energetic"
    queries.push(`${genreLabel} ${settings.mood}`); // e.g. "rock energetic"
  }

  // Add era-based queries to get tracks from specific decades
  // Limited to first 2 genres x first 2 eras to avoid too many queries
  if (settings.era.length > 0) {
    for (const genre of settings.genres.slice(0, 2)) {
      const genreLabel = genre.replace(/-/g, " ");
      for (const era of settings.era.slice(0, 2)) {
        const yearRange = ERA_YEAR_RANGES[era];
        if (yearRange) {
          queries.push(`${genreLabel} year:${yearRange}`); // e.g. "rock year:1980-1989"
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
 *   Multiple passes with offset are used to compensate, but may still get fewer than requested.
 * - Individual query failures (e.g. bad query syntax) are caught and logged, not fatal.
 * - Each Spotify request is capped at 10 results, distributed evenly across queries.
 *
 * @param settings - Parsed prompt settings (genres, mood, era, etc.)
 * @param trackCount - Exact number of track URIs to return (default 30)
 * @returns Array of Spotify track URI strings, e.g. ["spotify:track:abc123", ...]
 * @throws Error if token is invalid/expired or if 0 tracks were found across all queries
 */
export async function searchTracks(
  settings: ParsedPromptSettings,
  trackCount: number = 30,
): Promise<string[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const queries = buildSearchQueries(settings);
  const allUris = new Set<string>();

  // Distribute trackCount evenly across queries, capped at 10 per request.
  // e.g. 30 tracks / 4 queries = 8 per query (with remainder spread across first queries)
  const perQuery = Math.min(Math.ceil(trackCount / queries.length), 10);

  // Multiple passes with increasing offset to fill up if deduplication reduces count
  let offset = 0;
  const MAX_PASSES = 3;

  for (let pass = 0; pass < MAX_PASSES && allUris.size < trackCount; pass++) {
    for (const query of queries) {
      if (allUris.size >= trackCount) break;

      try {
        const params = new URLSearchParams({
          q: query,
          type: "track",
          limit: String(perQuery),
          offset: String(offset),
        });

        const { data } = await axios.get<SpotifySearchResponse>(
          `${SPOTIFY_BASE}/search?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        for (const track of data.tracks.items) {
          allUris.add(track.uri);
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }
        console.warn(`Search query "${query}" failed:`, err);
      }
    }

    // Next pass starts where this one left off
    offset += perQuery;
  }

  if (allUris.size === 0) {
    throw new Error(
      "No tracks found for your prompt. Try different keywords or genres.",
    );
  }

  // Shuffle (Fisher-Yates) so tracks from different queries are interleaved
  const uris = [...allUris];
  for (let i = uris.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uris[i], uris[j]] = [uris[j], uris[i]];
  }

  return uris.slice(0, trackCount);
}

/**
 * Fetches EVERY saved/liked track from the user's Spotify library by paginating
 * through all pages (50 tracks per page) until there are no more.
 *
 * Returns full track objects (not just URIs) so callers can inspect artist IDs,
 * release dates, etc. for filtering.
 *
 * @returns All saved SpotifyTrack objects
 * @throws Error if not authenticated or if token is expired (401)
 */
export async function fetchAllSavedTracks(): Promise<SpotifyTrack[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const tracks: SpotifyTrack[] = [];
  let url: string | null = `${SPOTIFY_BASE}/me/tracks?limit=50`;

  while (url) {
    try {
      const response = await axios.get<SpotifyLibraryResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const page: SpotifyLibraryResponse = response.data;
      for (const item of page.items) {
        tracks.push(item.track);
      }
      url = page.next;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      throw err;
    }
  }

  return tracks;
}

/**
 * Fetches genres for all given artist IDs via our server-side API route.
 *
 * The browser can't reliably call /v1/artists directly with the user's OAuth
 * token (Spotify returns 403). The route uses a Client Credentials token
 * (app-level) which has no such restriction.
 *
 * @param artistIds - Unique Spotify artist IDs
 * @returns Map of artistId → string[] of genres
 */
async function fetchArtistGenres(
  artistIds: string[],
): Promise<Map<string, string[]>> {
  const genreMap = new Map<string, string[]>();

  try {
    const { data } = await axios.post<Record<string, string[]>>(
      "/api/spotify/artist-genres",
      { ids: artistIds },
    );
    for (const [id, genres] of Object.entries(data)) {
      genreMap.set(id, genres);
    }
  } catch (err) {
    // Non-fatal: if genre lookup fails entirely, filtering will fall back to era-only
    console.warn("Artist genre fetch failed:", err);
  }

  return genreMap;
}

/**
 * Returns the release year as a number from a Spotify release_date string.
 * Handles "YYYY-MM-DD", "YYYY-MM", and "YYYY" formats.
 */
function releaseYear(releaseDate: string): number {
  return parseInt(releaseDate.slice(0, 4), 10);
}

/**
 * Filters a list of saved tracks down to those that match the parsed prompt settings.
 *
 * Matching rules (all applicable filters must pass):
 * - Genre: at least one of the track's artists must have a Spotify genre that
 *   contains (or is contained by) one of the requested genres. Case-insensitive.
 *   If settings.genres is empty, the genre filter is skipped.
 * - Era: the track's release year must fall inside at least one of the requested
 *   decade ranges. If settings.era is empty, the era filter is skipped.
 *
 * @param tracks - Full saved track objects
 * @param settings - Parsed prompt settings from the LLM
 * @param limit - Max number of URIs to return
 * @returns Up to `limit` matching track URIs, shuffled
 */
async function filterSavedTracksBySettings(
  tracks: SpotifyTrack[],
  settings: ParsedPromptSettings,
  limit: number,
): Promise<string[]> {
  // Collect unique artist IDs across all tracks
  const artistIds = [
    ...new Set(tracks.flatMap((t) => t.artists.map((a) => a.id))),
  ];

  const genreMap =
    artistIds.length > 0 ? await fetchArtistGenres(artistIds) : new Map<string, string[]>();

  const requestedGenres = settings.genres.map((g) => g.toLowerCase());

  // Build era year ranges for filtering: "1980s" → [1980, 1989]
  const eraRanges: [number, number][] = settings.era.flatMap((era) => {
    const range = ERA_YEAR_RANGES[era];
    if (!range) return [];
    const [start, end] = range.split("-").map(Number);
    return [[start, end]];
  });

  const matched: SpotifyTrack[] = [];

  for (const track of tracks) {
    // --- Genre filter ---
    if (requestedGenres.length > 0) {
      const artistGenres = track.artists.flatMap(
        (a) => genreMap.get(a.id) ?? [],
      );
      const genreMatches = requestedGenres.some((req) =>
        artistGenres.some(
          (ag) => ag.includes(req) || req.includes(ag),
        ),
      );
      if (!genreMatches) continue;
    }

    // --- Era filter ---
    if (eraRanges.length > 0) {
      const year = releaseYear(track.album.release_date);
      const eraMatches = eraRanges.some(([start, end]) => year >= start && year <= end);
      if (!eraMatches) continue;
    }

    matched.push(track);
  }

  if (matched.length === 0) {
    throw new Error(
      "None of your saved songs match the requested genres/era. Try a different prompt or uncheck 'Build from saved songs'.",
    );
  }

  // Shuffle matched tracks (Fisher-Yates)
  for (let i = matched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matched[i], matched[j]] = [matched[j], matched[i]];
  }

  return matched.slice(0, limit).map((t) => t.uri);
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
  trackUris: string[],
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
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      // 403 = user doesn't own the playlist or lacks the right scopes
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        throw new Error(
          "Spotify returned 403 Forbidden while adding tracks. Make sure you're logged in with `playlist-modify-public`/`playlist-modify-private` scopes and that the playlist is owned by your account (or is collaborative).",
        );
      }
      throw err;
    }
  }
}

/**
 * Main entry point: builds the final list of track URIs for a new playlist.
 *
 * THREE MODES:
 * 1. includeSavedMusic=false, settings provided → search Spotify (existing behaviour)
 * 2. includeSavedMusic=true,  settings provided → fetch ALL saved tracks, filter by
 *    genre/era from settings, return up to totalTracks matching URIs
 * 3. includeSavedMusic=true,  settings=null     → fetch ALL saved tracks, shuffle,
 *    return up to totalTracks (no filter — user gave no prompt)
 *
 * @param settings - Parsed prompt settings from the LLM, or null if no prompt was given
 * @param totalTracks - Desired number of tracks in the playlist
 * @param includeSavedMusic - Whether to source tracks from the user's library
 * @returns Array of track URIs
 */
export async function buildTrackList(
  settings: ParsedPromptSettings | null,
  totalTracks: number = 30,
  includeSavedMusic: boolean = false,
): Promise<string[]> {
  if (!includeSavedMusic) {
    // settings must be present when not using saved music (prompt is required in this path)
    return searchTracks(settings!, totalTracks);
  }

  // Fetch every saved track (all pages)
  const allSaved = await fetchAllSavedTracks();

  if (allSaved.length === 0) {
    throw new Error("Your Spotify library has no saved songs.");
  }

  // If the user provided a prompt, filter to only matching tracks
  if (settings && (settings.genres.length > 0 || settings.era.length > 0)) {
    return filterSavedTracksBySettings(allSaved, settings, totalTracks);
  }

  // No prompt (or no genre/era to filter on) — just shuffle and return
  for (let i = allSaved.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSaved[i], allSaved[j]] = [allSaved[j], allSaved[i]];
  }
  return allSaved.slice(0, totalTracks).map((t) => t.uri);
}
