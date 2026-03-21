import Header from "@/components/layouts/header";
import CreatePlaylistForm from "./components/form";

const Page = () => {
  return (
    <div className="max-w-[90%] mx-auto p-5 ">
      <Header />
      <h1 className="text-3xl font-bold">Create new Playlist</h1>



      <CreatePlaylistForm className="pt-5"/>
      


    </div>
  );
};

export default Page;
