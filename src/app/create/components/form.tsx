"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createPlaylist } from "../services/playlist-create.service";

const PlaylistScheme = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
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
    formState: { isSubmitting, errors },
  } = useForm<PlaylistTypes>({
    resolver: zodResolver(PlaylistScheme),
  });

  const onSubmit = async (data: PlaylistTypes) => {
    try {
      await createPlaylist(data);
      toast.success("Playlist created!", {
        description: `"${data.name}" has been created.`,
        richColors: true,
      });
      router.push("/");
    } catch {
      toast.error("Failed", {
        description: "Failed to create playlist, try again later.",
      });
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

      <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
        CREATE
      </Button>
    </form>
  );
};

export default CreatePlaylistForm;
