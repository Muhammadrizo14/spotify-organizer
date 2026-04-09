"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ParsedPromptSettings } from "@/types/playlist";
import { VALID_MOODS, VALID_ERAS, VALID_TEMPOS } from "../constants";
import GenreCombobox from "./genre-combobox";
import { usePlaylistSubmit } from "../hooks/use-playlist-submit";

const FilterPlaylistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  genres: z.array(z.string()).min(1, "Select at least one genre"),
  mood: z.enum(VALID_MOODS),
  era: z.array(z.enum(VALID_ERAS)).min(1, "Select at least one era"),
  tempo: z.enum(VALID_TEMPOS),
  energy: z.number().min(0).max(1),
  trackCount: z.number().min(10, "Min 10 tracks").max(50, "Max 50 tracks"),
  includeSavedMusic: z.boolean(),
});

type FilterPlaylistFields = z.infer<typeof FilterPlaylistSchema>;

const FilterPlaylistForm = () => {
  const { submit, step, isSubmitting } = usePlaylistSubmit();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FilterPlaylistFields>({
    resolver: zodResolver(FilterPlaylistSchema),
    defaultValues: {
      genres: [],
      mood: "energetic",
      era: ["2010s", "2020s"],
      tempo: "medium",
      energy: 0.5,
      trackCount: 20,
      includeSavedMusic: false,
    },
  });

  const watchedEras = watch("era");
  const watchedEnergy = watch("energy");

  const toggleEra = (era: (typeof VALID_ERAS)[number]) => {
    const current = watchedEras ?? [];
    if (current.includes(era)) {
      setValue("era", current.filter((e) => e !== era) as (typeof VALID_ERAS)[number][]);
    } else {
      setValue("era", [...current, era] as (typeof VALID_ERAS)[number][]);
    }
  };

  const onSubmit = async (data: FilterPlaylistFields) => {
    const settings: ParsedPromptSettings = {
      mood: data.mood,
      genres: data.genres,
      energy: data.energy,
      tempo: data.tempo,
      era: data.era,
      source: data.includeSavedMusic ? "saved" : "new",
    };
    await submit({
      name: data.name,
      description: data.description,
      settings,
      trackCount: data.trackCount,
      includeSavedMusic: data.includeSavedMusic,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <Input {...register("name")} placeholder="Playlist name" />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <Textarea
        {...register("description")}
        placeholder="Description (optional)"
        rows={3}
      />

      {/* Genres */}
      <div className="flex flex-col gap-1">
        <label className="text-sm">Genres</label>
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <GenreCombobox
              selected={field.value}
              onChange={field.onChange}
              maxSelections={5}
            />
          )}
        />
        {errors.genres && (
          <p className="text-sm text-red-500">{errors.genres.message}</p>
        )}
      </div>

      {/* Mood */}
      <div className="flex flex-col gap-1">
        <label className="text-sm">Mood</label>
        <Controller
          name="mood"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mood" />
              </SelectTrigger>
              <SelectContent>
                {VALID_MOODS.map((mood) => (
                  <SelectItem key={mood} value={mood}>
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Eras */}
      <div className="flex flex-col gap-2">
        <label className="text-sm">Era</label>
        <div className="flex flex-wrap gap-3">
          {VALID_ERAS.map((era) => (
            <div key={era} className="flex items-center gap-1.5">
              <Checkbox
                id={`era-${era}`}
                checked={watchedEras?.includes(era) ?? false}
                onCheckedChange={() => toggleEra(era)}
              />
              <label htmlFor={`era-${era}`} className="text-sm cursor-pointer">
                {era}
              </label>
            </div>
          ))}
        </div>
        {errors.era && (
          <p className="text-sm text-red-500">{errors.era.message as string}</p>
        )}
      </div>

      {/* Tempo */}
      <div className="flex flex-col gap-1">
        <label className="text-sm">Tempo</label>
        <Controller
          name="tempo"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow (&lt;100 BPM)</SelectItem>
                <SelectItem value="medium">Medium (100–130 BPM)</SelectItem>
                <SelectItem value="fast">Fast (&gt;130 BPM)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Energy */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm">Energy</label>
          <span className="text-sm text-muted-foreground">
            {watchedEnergy !== undefined ? Math.round(watchedEnergy * 10) / 10 : "0.5"}
          </span>
        </div>
        <Controller
          name="energy"
          control={control}
          render={({ field }) => (
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[field.value]}
              onValueChange={([v]) => field.onChange(v)}
            />
          )}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Calm</span>
          <span>Intense</span>
        </div>
      </div>

      {/* Track count */}
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

      {/* Include saved music */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="filter-includeSavedMusic"
          checked={watch("includeSavedMusic")}
          onCheckedChange={(checked) => setValue("includeSavedMusic", !!checked)}
        />
        <label htmlFor="filter-includeSavedMusic" className="text-sm cursor-pointer">
          Build playlist from my saved songs
        </label>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {step ?? "CREATE"}
      </Button>
    </form>
  );
};

export default FilterPlaylistForm;
