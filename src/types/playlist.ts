// ---- Types returned by the Groq LLM after parsing the user's prompt ----
// This is the structured output that the /api/parse-prompt route returns.
// It drives which Spotify search queries are built in spotify-tracks.service.ts.
export interface ParsedPromptSettings {
  mood: string;           // e.g. "chill", "hype", "energetic" — used as a keyword in search queries
  genres: string[];       // Spotify seed genre slugs, e.g. ["rock", "pop"] — used in genre: search filter
  energy: number;         // 0.0–1.0 intensity level (not currently used in search, reserved for future)
  tempo: "slow" | "medium" | "fast"; // BPM category (not currently used in search, reserved for future)
  era: string[];          // decade strings like ["1980s","1990s"] — mapped to year:YYYY-YYYY in search
  source: "new" | "saved" | "mix";   // whether to pull from search, user's library, or both
}

// ---- Spotify API response when creating a new playlist ----
// Only the fields we actually use from the full Spotify response.
export interface CreatePlaylistResponse {
  id: string;                              // the new playlist's Spotify ID — needed to add tracks to it
  external_urls: { spotify: string };      // link to view the playlist on Spotify
}

// ---- Single track object from Spotify search results ----
export interface SpotifyTrack {
  uri: string;                             // e.g. "spotify:track:abc123" — the identifier used to add tracks
  name: string;
  artists: { name: string }[];
}

// ---- Spotify /v1/search response (when type=track) ----
export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];                 // list of matching tracks
  };
}

// ---- Spotify /v1/me/tracks (saved/liked songs) paginated response ----
export interface SpotifyLibraryResponse {
  items: { track: SpotifyTrack }[];        // each item wraps a track
  next: string | null;                     // URL for next page, or null if last page
  total: number;                           // total saved tracks in user's library
}
