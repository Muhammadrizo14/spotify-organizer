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

const PlaylistScheme = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  prompt: z.string().optional(),
  includeSavedMusic: z.boolean(),
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
    defaultValues: { includeSavedMusic: false },
  });

  const onSubmit = async (data: PlaylistTypes) => {
    try {
      let trackUris: string[] = [];

      if (data.prompt?.trim()) {
        toast.info("Analyzing your prompt...");
        const res = await axios.post<ParsedPromptSettings>("/api/parse-prompt", {
          prompt: data.prompt,
        });
        const settings = res.data;

        toast.info("Finding tracks...");
        trackUris = await buildTrackList(settings, data.includeSavedMusic);
      }

      toast.info("Creating playlist...");
      const playlist = await createPlaylist({
        name: data.name,
        description: data.description,
      });

      if (trackUris.length > 0) {
        toast.info(`Adding ${trackUris.length} tracks...`);
        await addTracksToPlaylist(playlist.id, trackUris);
      }

      toast.success("Playlist created!", {
        description: `"${data.name}"${trackUris.length > 0 ? ` with ${trackUris.length} tracks` : ""}.`,
        richColors: true,
      });
      router.push("/");
    } catch (err: unknown) {
      let description = "Something went wrong, try again later.";
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        description = err.response.data.error;
      } else if (err instanceof Error) {
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
      <div className="flex flex-col gap-1">
        <Input {...register("name")} placeholder="Playlist name" />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <Textarea
        {...register("description")}
        placeholder="Description (optional)"
        rows={4}
      />

      <Textarea
        {...register("prompt")}
        placeholder="Prompt (optional) — describe what kind of songs to include"
        rows={4}
      />

      <div className="flex items-center gap-3">
        <Switch
          checked={watch("includeSavedMusic")}
          onCheckedChange={(checked) => setValue("includeSavedMusic", checked)}
        />
        <label className="text-sm">
          Include my saved music (60% liked songs, 40% new)
        </label>
      </div>

      <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
        CREATE
      </Button>
    </form>
  );
};

export default CreatePlaylistForm;
