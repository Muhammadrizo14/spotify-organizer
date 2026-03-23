import axios from "axios";
import { getValidToken } from "@/lib/spotify-auth";
import { CreatePlaylistResponse } from "@/types/playlist";

export interface CreatePlaylistPayload {
  name: string;
  description?: string;
}

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
