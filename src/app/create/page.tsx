import CreatePlaylistTabs from "./components/create-playlist-tabs";

const Page = () => {
  return (
    <div className="max-w-[90%] mx-auto p-5">
      <h1 className="text-3xl font-bold">Create new Playlist</h1>
      <CreatePlaylistTabs className="pt-5" />
    </div>
  );
};

export default Page;
