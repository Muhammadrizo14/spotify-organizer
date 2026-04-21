"use client";

import Header from "@/components/layouts/header";
import axios from "axios";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getValidToken } from "@/lib/spotify-auth";
import { LinkButton } from "@/components/ui/link-button";
import { CirclePlus } from "lucide-react";

// ---- Spotify API response types (only fields we use) ----

export interface SpotifyUserProfile {
  country: string;
  display_name: string;
  email: string;

  explicit_content: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };

  external_urls: {
    spotify: string;
  };

  followers: {
    href: string | null;
    total: number;
  };

  href: string;
  id: string;

  images: {
    url: string;
    height: number | null;
    width: number | null;
  }[];

  product: string;
  type: string;
  uri: string;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string; height: number | null; width: number | null }[];
  collaborative: boolean;
  public: boolean | null;
  snapshot_id: string;
  tracks: {
    total: number;
  };
  owner: {
    display_name: string | null;
    id: string;
    external_urls: { spotify: string };
  };
  external_urls: { spotify: string };  // link to open playlist in Spotify
  type: string;
  uri: string;
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
}

export default function Home() {
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user profile and playlists on page load
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      const token = await getValidToken();

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [userRes, playlistsRes] = await Promise.all([
          axios.get<SpotifyUserProfile>("https://api.spotify.com/v1/me", { headers }),
          axios.get<SpotifyPlaylistsResponse>(
            "https://api.spotify.com/v1/me/playlists?limit=50",
            { headers },
          ),
        ]);

        if (active) {
          setUser(userRes.data);
          setPlaylists(playlistsRes.data.items);
        }
      } catch (err) {
        if (!active) return;
        // Only clear tokens on a definitive 401 — transient errors (network,
        // rate-limit, 5xx) should not log the user out.
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("token_expiry");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => { active = false; };
  }, []);



  return (
    <div className="max-w-[90%] mx-auto p-5">

      {loading ? (
        <p className="pt-5 text-muted-foreground">Loading...</p>
      ) : !user ? (
        <p className="pt-5 text-muted-foreground">
          Log in with Spotify to see your playlists.
        </p>
      ) : (
        <div className="pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Welcome {user.display_name}!</h2>

            {/* Link to the create playlist page */}
            <LinkButton href="/create">
              <CirclePlus />
              Create
            </LinkButton>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-3">
            Your Playlists ({playlists.length})
          </h3>

          {/* Grid of playlist cards — each links to the playlist on Spotify */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <a
                key={playlist.id}
                href={playlist.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                  {playlist.images?.[0] ? (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="w-full aspect-square object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full border-b border-b-gray-300 flex items-center justify-center ">
                      <p className="text-lg">No image was found</p>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base line-clamp-1">
                      {playlist.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="-mt-2">
                    <p className="text-sm text-muted-foreground">
                      {playlist.tracks.total} tracks
                    </p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
