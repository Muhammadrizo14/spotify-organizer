import axios from "axios";
import { getValidToken } from "@/lib/spotify-auth";
import {
  ParsedPromptSettings,
  SpotifyRecommendationsResponse,
  SpotifyLibraryResponse,
} from "@/types/playlist";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

const TEMPO_MAP: Record<string, number> = { slow: 85, medium: 115, fast: 145 };

const MOOD_VALENCE: Record<string, number> = {
  chill: 0.4,
  hype: 0.9,
  sad: 0.15,
  romantic: 0.6,
  angry: 0.3,
  upbeat: 0.8,
  dark: 0.15,
  mellow: 0.35,
  energetic: 0.85,
  peaceful: 0.5,
};

export async function getRecommendedTracks(
  settings: ParsedPromptSettings,
  limit: number = 30
): Promise<string[]> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const params = new URLSearchParams({
    seed_genres: settings.genres.slice(0, 5).join(","),
    target_energy: String(settings.energy),
    target_tempo: String(TEMPO_MAP[settings.tempo] ?? 115),
    target_valence: String(MOOD_VALENCE[settings.mood] ?? 0.5),
    limit: String(Math.min(limit, 100)),
  });

  const { data } = await axios.get<SpotifyRecommendationsResponse>(
    `${SPOTIFY_BASE}/recommendations?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data.tracks.map((t) => t.uri);
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
    await axios.post(
      `${SPOTIFY_BASE}/playlists/${playlistId}/tracks`,
      { uris: batch },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
}

export async function buildTrackList(
  settings: ParsedPromptSettings,
  includeSavedMusic: boolean,
  totalTracks: number = 30
): Promise<string[]> {
  if (!includeSavedMusic) {
    return getRecommendedTracks(settings, totalTracks);
  }

  // 60% saved, 40% new
  const savedCount = Math.round(totalTracks * 0.6);
  const newCount = totalTracks - savedCount;

  const [saved, recommended] = await Promise.all([
    getSavedTracks(savedCount * 3), // fetch extra pool for random sampling
    getRecommendedTracks(settings, newCount),
  ]);

  const shuffled = saved.sort(() => Math.random() - 0.5).slice(0, savedCount);
  const recommendedSet = new Set(recommended);
  const dedupedSaved = shuffled.filter((uri) => !recommendedSet.has(uri));

  return [...dedupedSaved, ...recommended];
}
