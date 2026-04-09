"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ParsedPromptSettings } from "@/types/playlist";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createPlaylist } from "../services/playlist-create.service";
import {
  addTracksToPlaylist,
  buildTrackList,
} from "../services/spotify-tracks.service";

const PlaylistScheme = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  prompt: z.string().optional(),
  includeSavedMusic: z.boolean(),
  trackCount: z.number().min(10, "Min 10 tracks").max(50, "Max 50 tracks"),
});

type PlaylistTypes = z.infer<typeof PlaylistScheme>;

interface IProps {
  className?: string;
}

const CreatePlaylistForm = ({ className }: IProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<PlaylistTypes>({
    resolver: zodResolver(PlaylistScheme),
    defaultValues: { includeSavedMusic: false, trackCount: 20 },
  });

  const onSubmit = async (data: PlaylistTypes) => {
    try {
      let trackUris: string[] = [];

      // STEP 1: If a prompt was given, parse it with the LLM regardless of the checkbox.
      //         The settings are used either for Spotify search or for filtering saved tracks.
      let settings: ParsedPromptSettings | null = null;
      if (data.prompt?.trim()) {
        toast.info("Analyzing your prompt...");
        const res = await axios.post<ParsedPromptSettings>("/api/parse-prompt", {
          prompt: data.prompt,
        });
        settings = res.data;
      }

      // STEP 2: Build the track list
      if (data.includeSavedMusic) {
        // Checkbox ON: scan the full saved library and filter to tracks matching the prompt.
        // If no prompt was given, all saved tracks are eligible (shuffled).
        toast.info("Scanning your saved tracks...");
        trackUris = await buildTrackList(settings, data.trackCount, true);
      } else if (settings) {
        // Checkbox OFF + prompt: search Spotify for matching tracks
        toast.info("Finding tracks...");
        trackUris = await buildTrackList(settings, data.trackCount, false);
      }

      // Create the playlist on Spotify (initially empty)
      toast.info("Creating playlist...");
      const playlist = await createPlaylist({
        name: data.name,
        description: data.description,
      });

      // Add the found tracks to the playlist (if any)
      if (trackUris.length > 0) {
        toast.info(`Adding ${trackUris.length} tracks...`);
        await addTracksToPlaylist(playlist.id, trackUris);
      }

      // Success! Show toast and redirect to home page
      toast.success("Playlist created!", {
        description: `"${data.name}"${trackUris.length > 0 ? ` with ${trackUris.length} tracks` : ""}.`,
        richColors: true,
      });
      router.push("/");
    } catch (err: unknown) {
      // Extract a user-friendly error message from whatever went wrong
      let description = "Something went wrong, try again later.";
      if (axios.isAxiosError(err)) {
        // Error from an API route (parse-prompt) or Spotify API
        const data = err.response?.data as any;
        const apiError = data?.error;

        if (typeof apiError === "string") {
          description = apiError; // e.g. "Groq API rate limit reached"
        } else if (typeof apiError?.message === "string") {
          description = apiError.message;
        } else if (typeof data?.message === "string") {
          description = data.message;
        }
      } else if (err instanceof Error) {
        // Error thrown directly in our code (e.g. "Not authenticated", "No tracks found")
        description = err.message;
      }
      toast.error("Failed", { description });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`flex flex-col gap-4 ${className}`}
    >
      {/* Playlist name — required */}
      <div className="flex flex-col gap-1">
        <Input {...register("name")} placeholder="Playlist name" />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Description — optional, shown on the playlist in Spotify */}
      <Textarea
        {...register("description")}
        placeholder="Description (optional)"
        rows={4}
      />

      {/* Prompt — optional natural language input sent to Groq LLM for parsing.
          If left empty, an empty playlist is created (no tracks searched). */}
      <Textarea
        {...register("prompt")}
        placeholder="Prompt (optional) — describe what kind of songs to include"
        rows={4}
      />

      {/* Track count — how many tracks to add (10-50).
          valueAsNumber converts the HTML input string to a number for zod validation. */}
      <div className="flex flex-col gap-1">
        <label className="text-sm">Number of tracks (10–50)</label>
        <Input
          {...register("trackCount", { valueAsNumber: true })}
          type="number"
          min={10}
          max={50}
          placeholder="20"
        />
        {errors.trackCount && (
          <p className="text-sm text-red-500">{errors.trackCount.message}</p>
        )}
      </div>

      {/* Include saved music — when ON, playlist will be built from the user's saved songs only */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="includeSavedMusic"
          checked={watch("includeSavedMusic")}
          onCheckedChange={(checked) => setValue("includeSavedMusic", !!checked)}
        />
        <label htmlFor="includeSavedMusic" className="text-sm cursor-pointer">
          Build playlist from my saved songs
        </label>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "CREATE"}
      </Button>
    </form>
  );
};

export default CreatePlaylistForm;
