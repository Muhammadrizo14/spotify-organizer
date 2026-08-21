import type { Metadata } from "next";
import PreviewLanding from "@/components/preview/preview-landing";

export const metadata: Metadata = {
  title: "Spotify organizer — preview",
  description:
    "A walkthrough of Spotify organizer. The hosted build is preview-only because Spotify does not allow a third-party service to organize a user's library.",
};

/**
 * Direct route for the preview page, so it can be reviewed while developing
 * without flipping NEXT_PUBLIC_APP_MODE. In preview mode the root layout
 * renders this same component for every route.
 */
const Page = () => <PreviewLanding />;

export default Page;
