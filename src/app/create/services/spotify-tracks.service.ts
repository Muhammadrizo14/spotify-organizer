import axios from "axios";
import { getValidToken } from "@/lib/spotify-auth";
import {
  ParsedPromptSettings,
  SpotifySearchResponse,
  SpotifyLibraryResponse,
} from "@/types/playlist";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

// Map era decades to year ranges for the Spotify search query
const ERA_YEAR_RANGES: Record<string, string> = {
  "1960s": "1960-1969",
  "1970s": "1970-1979",
  "1980s": "1980-1989",
  "1990s": "1990-1999",
  "2000s": "2000-2009",
  "2010s": "2010-2019",
  "2020s": "2020-2029",
};

// Build multiple search queries from the parsed settings so we get diverse results
function buildSearchQueries(settings: ParsedPromptSettings): string[] {
  const queries: string[] = [];

  // Genre-based queries with mood keyword
  for (const genre of settings.genres) {
    const genreLabel = genre.replace(/-/g, " ");
    queries.push(`genre:${genre} ${settings.mood}`);
    queries.push(`${genreLabel} ${settings.mood}`);
  }

  // Add era-specific queries if eras are provided
  if (settings.era.length > 0) {
    for (const genre of settings.genres.slice(0, 2)) {
      const genreLabel = genre.replace(/-/g, " ");
      for (const era of settings.era.slice(0, 2)) {
        const yearRange = ERA_YEAR_RANGES[era];
        if (yearRange) {
          queries.push(`${genreLabel} year:${yearRange}`);
        }
      }
    }
  }

  return queries;
}

export async function searchTracks(
  settings: ParsedPromptSettings,
  limit: number = 30
): Promise<string[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const queries = buildSearchQueries(settings);
  const perQuery = Math.max(5, Math.ceil(limit / queries.length));
  const allUris = new Set<string>();

  for (const query of queries) {
    if (allUris.size >= limit) break;

    try {
      const params = new URLSearchParams({
        q: query,
        type: "track",
        limit: String(Math.min(perQuery, 50)),
      });

      const { data } = await axios.get<SpotifySearchResponse>(
        `${SPOTIFY_BASE}/search?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      for (const track of data.tracks.items) {
        allUris.add(track.uri);
      }
    } catch (err) {
      console.warn(`Search query "${query}" failed:`, err);
    }
  }

  // Shuffle to mix results from different queries
  const uris = [...allUris];
  for (let i = uris.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uris[i], uris[j]] = [uris[j], uris[i]];
  }

  return uris.slice(0, limit);
}

export async function getSavedTracks(limit: number = 50): Promise<string[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const uris: string[] = [];
  let url: string | null = `${SPOTIFY_BASE}/me/tracks?limit=${Math.min(limit, 50)}`;

  while (url && uris.length < limit) {
    const response = await axios.get<SpotifyLibraryResponse>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const page: SpotifyLibraryResponse = response.data;
    for (const item of page.items) {
      uris.push(item.track.uri);
    }
    url = page.next;
  }

  return uris.slice(0, limit);
}

export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    try {
      await axios.post(
        `${SPOTIFY_BASE}/playlists/${playlistId}/items`,
        { uris: batch },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        throw new Error(
          "Spotify returned 403 Forbidden while adding tracks. Make sure you’re logged in with `playlist-modify-public`/`playlist-modify-private` scopes and that the playlist is owned by your account (or is collaborative)."
        );
      }
      throw err;
    }
  }
}

export async function buildTrackList(
  settings: ParsedPromptSettings,
  includeSavedMusic: boolean,
  totalTracks: number = 30
): Promise<string[]> {
  if (!includeSavedMusic) {
    return searchTracks(settings, totalTracks);
  }

  // 60% saved, 40% new
  const savedCount = Math.round(totalTracks * 0.6);
  const newCount = totalTracks - savedCount;

  const [saved, searched] = await Promise.all([
    getSavedTracks(savedCount * 3),
    searchTracks(settings, newCount),
  ]);

  const shuffled = saved.sort(() => Math.random() - 0.5).slice(0, savedCount);
  const searchedSet = new Set(searched);
  const dedupedSaved = shuffled.filter((uri) => !searchedSet.has(uri));

  return [...dedupedSaved, ...searched];
}
