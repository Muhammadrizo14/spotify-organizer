"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ParsedPromptSettings } from "@/types/playlist";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createPlaylist } from "../services/playlist-create.service";
import { addTracksToPlaylist, buildTrackList } from "../services/spotify-tracks.service";

/**
 * Zod schema for form validation.
 * - name: required, at least 1 character
 * - description: optional text for the playlist description
 * - prompt: optional natural language prompt (e.g. "chill 90s hip-hop")
 *           → sent to /api/parse-prompt to extract genre/mood/era settings
 * - includeSavedMusic: if true, 60% of tracks come from user's liked songs
 * - trackCount: number between 10-50, converted from string via valueAsNumber on the input
 */
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

/**
 * CreatePlaylistForm — The main form for creating a Spotify playlist.
 *
 * SUBMISSION FLOW (onSubmit):
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 1. If prompt is provided:                                         │
 * │    a) POST /api/parse-prompt → Groq LLM extracts settings (JSON)  │
 * │    b) buildTrackList() → searches Spotify for matching tracks      │
 * │                                                                    │
 * │ 2. createPlaylist() → creates empty playlist on Spotify            │
 * │                                                                    │
 * │ 3. If tracks were found:                                          │
 * │    addTracksToPlaylist() → adds track URIs to the playlist         │
 * │                                                                    │
 * │ 4. Show success toast → redirect to home page                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ERROR HANDLING:
 * - Axios errors (API responses): extracts error message from response body
 * - Regular errors (e.g. "Not authenticated"): shows error.message
 * - All errors are shown as a toast notification
 */
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

      // STEP 1: If user provided a prompt, parse it and find matching tracks
      if (data.prompt?.trim()) {
        // Send the prompt to our API route which calls Groq LLM to extract
        // structured settings (mood, genres, era, etc.)
        toast.info("Analyzing your prompt...");
        const res = await axios.post<ParsedPromptSettings>("/api/parse-prompt", {
          prompt: data.prompt,
        });
        const settings = res.data;

        // Use the parsed settings to search Spotify for matching tracks
        // This calls searchTracks() and optionally getSavedTracks()
        toast.info("Finding tracks...");
        trackUris = await buildTrackList(settings, data.includeSavedMusic, data.trackCount);
      }

      // STEP 2: Create the playlist on Spotify (initially empty)
      toast.info("Creating playlist...");
      const playlist = await createPlaylist({
        name: data.name,
        description: data.description,
      });

      // STEP 3: Add the found tracks to the playlist (if any)
      if (trackUris.length > 0) {
        toast.info(`Adding ${trackUris.length} tracks...`);
        await addTracksToPlaylist(playlist.id, trackUris);
      }

      // STEP 4: Success! Show toast and redirect to home page
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
          description = apiError;                   // e.g. "Groq API rate limit reached"
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

      {/* Include saved music toggle — when ON, 60% of tracks come from liked songs,
          40% from search. When OFF, all tracks come from Spotify search. */}
      {/* <div className="flex items-center gap-3"> */}
      {/*   <Switch */}
      {/*     checked={watch("includeSavedMusic")} */}
      {/*     onCheckedChange={(checked) => setValue("includeSavedMusic", checked)} */}
      {/*   /> */}
      {/*   <label className="text-sm"> */}
      {/*     Include my saved music (60% liked songs, 40% new) */}
      {/*   </label> */}
      {/* </div> */}

      <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
        CREATE
      </Button>
    </form>
  );
};

export default CreatePlaylistForm;
