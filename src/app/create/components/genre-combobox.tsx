"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import { SPOTIFY_SEED_GENRES } from "../constants";

interface GenreComboboxProps {
  selected: string[];
  onChange: (genres: string[]) => void;
  maxSelections?: number;
}

export default function GenreCombobox({
  selected,
  onChange,
  maxSelections = 5,
}: GenreComboboxProps) {
  const [open, setOpen] = useState(false);

  const toggle = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else if (selected.length < maxSelections) {
      onChange([...selected, genre]);
    }
  };

  const remove = (genre: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((g) => g !== genre));
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {selected.length === 0
                ? "Select genres..."
                : `${selected.length} genre${selected.length > 1 ? "s" : ""} selected`}
            </span>
            <CaretDownIcon className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search genres..." />
            <CommandList>
              <CommandEmpty>No genre found.</CommandEmpty>
              <CommandGroup>
                {SPOTIFY_SEED_GENRES.map((genre) => {
                  const isSelected = selected.includes(genre);
                  const isDisabled = !isSelected && selected.length >= maxSelections;
                  return (
                    <CommandItem
                      key={genre}
                      value={genre}
                      onSelect={() => !isDisabled && toggle(genre)}
                      data-checked={isSelected}
                      className={isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                    >
                      {genre}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((genre) => (
            <Badge key={genre} variant="secondary" className="gap-1 pr-1">
              {genre}
              <button
                type="button"
                onClick={(e) => remove(genre, e)}
                className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
