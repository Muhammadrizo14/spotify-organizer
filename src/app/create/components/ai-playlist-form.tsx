"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ParsedPromptSettings } from "@/types/playlist";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { usePlaylistSubmit } from "../hooks/use-playlist-submit";

const AIPlaylistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  prompt: z.string().optional(),
  includeSavedMusic: z.boolean(),
  trackCount: z.number().min(10, "Min 10 tracks").max(50, "Max 50 tracks"),
});

type AIPlaylistFields = z.infer<typeof AIPlaylistSchema>;

const AIPlaylistForm = () => {
  const { submit, step, isSubmitting } = usePlaylistSubmit();
  const [localStep, setLocalStep] = useState<string | null>(null);

  const buttonLabel = localStep ?? step ?? "CREATE";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AIPlaylistFields>({
    resolver: zodResolver(AIPlaylistSchema),
    defaultValues: { includeSavedMusic: false, trackCount: 20 },
  });

  const onSubmit = async (data: AIPlaylistFields) => {
    let settings: ParsedPromptSettings | null = null;
    if (data.prompt?.trim()) {
      setLocalStep("Analyzing prompt...");
      try {
        const res = await axios.post<ParsedPromptSettings>("/api/parse-prompt", {
          prompt: data.prompt,
        });
        settings = res.data;
      } catch (err) {
        setLocalStep(null);
        let description = "Failed to analyze prompt.";
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as Record<string, unknown>;
          if (typeof data?.error === "string") description = data.error as string;
        }
        toast.error("Failed", { description });
        return;
      }
    }
    setLocalStep(null);
    await submit({
      name: data.name,
      description: data.description,
      settings,
      trackCount: data.trackCount,
      includeSavedMusic: data.includeSavedMusic,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Input {...register("name")} placeholder="Playlist name" />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <Textarea
        {...register("description")}
        placeholder="Description (optional)"
        rows={3}
      />

      <Textarea
        {...register("prompt")}
        placeholder='Describe your playlist — e.g. "upbeat 80s rock for a road trip"'
        rows={4}
      />

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

      <div className="flex items-center gap-3">
        <Checkbox
          id="ai-includeSavedMusic"
          checked={watch("includeSavedMusic")}
          onCheckedChange={(checked) => setValue("includeSavedMusic", !!checked)}
        />
        <label htmlFor="ai-includeSavedMusic" className="text-sm cursor-pointer">
          Build playlist from my saved songs
        </label>
      </div>

      <Button type="submit" disabled={isSubmitting || localStep !== null}>
        {buttonLabel}
      </Button>
    </form>
  );
};

export default AIPlaylistForm;
