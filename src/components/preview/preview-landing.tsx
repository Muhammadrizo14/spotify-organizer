import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PREVIEW_SCREENSHOTS } from "./screenshots";

// Inline SVGs rather than lucide-react: this is a server component, and the
// icon package's ESM entry does not resolve in the RSC graph.
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
    <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const TerminalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
  >
    <path d="m4 17 6-6-6-6" />
    <path d="M12 19h8" />
  </svg>
);

const SPOTIFY_POLICY_URL = "https://developer.spotify.com/policy";
const REPO_URL = "https://github.com/Muhammadrizo14/spotify-organizer";

const LOCAL_SETUP_STEPS = [
  "git clone the repository and run npm install",
  "Copy .env.example to .env.local and fill in your own Spotify and AI keys",
  "Set NEXT_PUBLIC_APP_MODE=development so the app renders instead of this page",
  "Run npm run dev and open http://127.0.0.1:3000",
];

/**
 * The page every route falls back to when the app runs in preview mode.
 *
 * It has to stand on its own: no Spotify login, no API calls, nothing that
 * touches a user's library — only screenshots of the real thing plus the
 * reason the hosted build is looking rather than doing.
 */
const PreviewLanding = () => {
  return (
    <div className="max-w-[90%] mx-auto p-5 pb-16">
      <section className="pt-10 pb-12 max-w-3xl">
        <Badge variant="outline" className="mb-4">
          Preview only
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Spotify organizer
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Build Spotify playlists from your own saved library — describe the
          mood in a sentence and let the AI translate it into filters, or set
          the genres, decades, tempo and energy by hand.
        </p>
        <p className="mt-4 text-muted-foreground">
          This deployment is a walkthrough, not a working app. Everything below
          is a screenshot of the real project running locally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href={REPO_URL} size="lg" target="_blank" rel="noopener noreferrer">
            <GithubIcon />
            View the source
          </LinkButton>
          <LinkButton
            href={SPOTIFY_POLICY_URL}
            size="lg"
            variant="outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read Spotify&apos;s policy
          </LinkButton>
        </div>
      </section>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LockIcon />
            Why you cannot sign in here
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Spotify does not permit an outsourced, third-party hosted service to
            organize a user&apos;s library on their behalf. Their{" "}
            <a
              className="underline text-blue-500 hover:text-blue-600 focus:text-blue-300"
              href={SPOTIFY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Developer Policy
            </a>{" "}
            restricts building an app that replicates a core Spotify experience,
            and restricts moving a user&apos;s data out to another service:
          </p>
          <blockquote className="border-l-2 border-destructive/40 pl-4 space-y-2 italic">
            <p>
              &ldquo;Do not &hellip; mimic, or replicate or attempt to replace a
              core user experience of Spotify or its group companies without our
              prior written permission.&rdquo;{" "}
              <span className="not-italic">— Developer Policy, III.11</span>
            </p>
            <p>
              &ldquo;Do not build an SDA that enables the transfer of data to
              another service, except for the purpose of enabling a user to
              transfer their personal data, or the metadata of the user&apos;s
              playlists to another service.&rdquo;{" "}
              <span className="not-italic">— Developer Policy, III.9</span>
            </p>
          </blockquote>
          <p>
            On top of that, an app that has not been granted extended quota mode
            may only be used by accounts the developer has explicitly added, so
            a public deployment could not serve visitors anyway. Rather than
            offer a login that would fail — or worse, work in a way the policy
            forbids — the hosted build ships with the app disabled and the
            Spotify routes turned off.
          </p>
        </CardContent>
      </Card>

      <section className="pt-14">
        <h2 className="text-2xl font-bold">Screenshots</h2>
        <p className="mt-2 text-muted-foreground">
          Captured from the app running locally, where the Spotify integration
          is fully enabled.
        </p>

        {/* items-start: each shot keeps its own aspect ratio instead of being
            stretched to match the tallest card in the row. */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {PREVIEW_SCREENSHOTS.map((shot) => (
            <Card key={shot.src} className="overflow-hidden pt-0">
              <Image
                src={shot.src}
                alt={shot.title}
                width={shot.width}
                height={shot.height}
                className="w-full h-auto border-b border-border"
              />
              <CardHeader>
                <CardTitle className="text-base">{shot.title}</CardTitle>
              </CardHeader>
              <CardContent className="-mt-2">
                <p className="text-sm text-muted-foreground">
                  {shot.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="pt-14">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TerminalIcon />
          Run it yourself
        </h2>
        <p className="mt-2 text-muted-foreground">
          The app is fully functional locally, where you are the only user of
          your own Spotify developer app.
        </p>
        <ol className="mt-6 space-y-3 max-w-3xl">
          {LOCAL_SETUP_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default PreviewLanding;
