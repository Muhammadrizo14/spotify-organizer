import axios from "axios";
import { getValidToken } from "@/lib/spotify-auth";

export interface CreatePlaylistPayload {
  name: string;
  description?: string;
}

export const createPlaylist = async (payload: CreatePlaylistPayload): Promise<void> => {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  await axios.post(
    `https://api.spotify.com/v1/me/playlists`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
