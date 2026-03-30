/**
 * playlist-create.service.ts — Creates a new empty playlist on the user's Spotify account.
 *
 * Called from the create form after tracks have been found.
 * The returned playlist ID is then used by addTracksToPlaylist() to populate it.
 *
 * Spotify API: POST /v1/me/playlists
 * Requires scope: playlist-modify-public or playlist-modify-private
 */

import axios from "axios";
import { getValidToken } from "@/lib/spotify-auth";
import { CreatePlaylistResponse } from "@/types/playlist";

export interface CreatePlaylistPayload {
  name: string;              // playlist name shown in Spotify
  description?: string;      // optional description text
}

/**
 * Creates a new playlist on the current user's Spotify account.
 *
 * @param payload - { name, description } for the new playlist
 * @returns The created playlist's ID and Spotify URL
 * @throws Error if not authenticated or if Spotify API rejects the request
 */
export const createPlaylist = async (payload: CreatePlaylistPayload): Promise<CreatePlaylistResponse> => {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const { data } = await axios.post<CreatePlaylistResponse>(
    `https://api.spotify.com/v1/me/playlists`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};
