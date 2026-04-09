"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import AIPlaylistForm from "./ai-playlist-form";
import FilterPlaylistForm from "./filter-playlist-form";

interface IProps {
  className?: string;
}

const CreatePlaylistTabs = ({ className }: IProps) => {
  return (
    <Tabs defaultValue="ai" className={className}>
      <TabsList>
        <TabsTrigger value="ai">AI</TabsTrigger>
        <TabsTrigger value="filters">Custom Filters</TabsTrigger>
      </TabsList>
      <TabsContent value="ai" className="pt-4">
        <AIPlaylistForm />
      </TabsContent>
      <TabsContent value="filters" className="pt-4">
        <FilterPlaylistForm />
      </TabsContent>
    </Tabs>
  );
};

export default CreatePlaylistTabs;
