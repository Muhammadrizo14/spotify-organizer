export interface ParsedPromptSettings {
  mood: string;
  genres: string[];
  energy: number;
  tempo: "slow" | "medium" | "fast";
  era: string[];
  source: "new" | "saved" | "mix";
}

export interface CreatePlaylistResponse {
  id: string;
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artists: { name: string }[];
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

export interface SpotifyLibraryResponse {
  items: { track: SpotifyTrack }[];
  next: string | null;
  total: number;
}
