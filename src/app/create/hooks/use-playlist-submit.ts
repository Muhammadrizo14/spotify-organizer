"use client";

import { createPlaylist } from "../services/playlist-create.service";
import { addTracksToPlaylist, buildTrackList } from "../services/spotify-tracks.service";
import { ParsedPromptSettings } from "@/types/playlist";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";

interface PlaylistSubmitParams {
  name: string;
  description?: string;
  settings: ParsedPromptSettings | null;
  trackCount: number;
  includeSavedMusic: boolean;
}

export function usePlaylistSubmit() {
  const router = useRouter();
  const [step, setStep] = useState<string | null>(null);

  const submit = async (params: PlaylistSubmitParams) => {
    try {
      let trackUris: string[] = [];

      if (params.includeSavedMusic) {
        setStep("Scanning saved tracks...");
        trackUris = await buildTrackList(params.settings, params.trackCount, true);
      } else if (params.settings) {
        setStep("Finding tracks...");
        trackUris = await buildTrackList(params.settings, params.trackCount, false);
      }

      setStep("Creating playlist...");
      const playlist = await createPlaylist({
        name: params.name,
        description: params.description,
      });

      if (trackUris.length > 0) {
        setStep(`Adding ${trackUris.length} tracks...`);
        await addTracksToPlaylist(playlist.id, trackUris);
      }

      toast.success("Playlist created!", {
        description: `"${params.name}"${trackUris.length > 0 ? ` with ${trackUris.length} tracks` : ""}.`,
        richColors: true,
      });
      router.push("/");
    } catch (err: unknown) {
      let description = "Something went wrong, try again later.";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, unknown>;
        const apiError = data?.error;
        if (typeof apiError === "string") {
          description = apiError;
        } else if (typeof (apiError as Record<string, unknown>)?.message === "string") {
          description = (apiError as Record<string, unknown>).message as string;
        } else if (typeof data?.message === "string") {
          description = data.message as string;
        }
      } else if (err instanceof Error) {
        description = err.message;
      }
      toast.error("Failed", { description });
    } finally {
      setStep(null);
    }
  };

  return { submit, step, isSubmitting: step !== null };
}
