# Spotify Organizer

An AI-powered web app that creates Spotify playlists from natural language prompts. Describe the vibe you want — mood, genre, era — and the app finds matching tracks and builds the playlist in your Spotify account.

## Features

- **AI Playlist Creation** — Write a prompt like "chill 90s jazz" or "upbeat indie road trip songs" and get a curated playlist
- **Smart Track Discovery** — Multi-query search strategy with genre normalization against Spotify's 150+ seed genres
- **Spotify Integration** — OAuth2 login, view your profile and existing playlists, create new ones directly in your account
- **LLM-Powered Parsing** — Uses Groq (Llama 3.3 70B) to extract mood, genres, energy, tempo, and era from your prompt

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (Radix-based components)
- **React Hook Form** + **Zod** for validation
- **OpenAI SDK** (Groq-compatible) for LLM prompt parsing
- **Spotify Web API** for auth and playlist management

## Getting Started

### Prerequisites

- Node.js 18+
- A [Spotify Developer App](https://developer.spotify.com/dashboard) (for Client ID and Secret)
- A [Groq API key](https://console.groq.com) (free tier available)

### Setup

1. Clone the repo:

   ```bash
   git clone https://github.com/your-username/spotify-orgonizer.git
   cd spotify-orgonizer
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example env file and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

   ```
   NEXT_PUBLIC_APP_MODE=development   # "development" runs the app; anything else serves the preview
   NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
   NEXT_PUBLIC_CLIENT_ID=       # Spotify App Client ID
   SPOTIFY_CLIENT_SECRET=       # Spotify App Client Secret
   GROQ_API_KEY=                # Groq API key
   ```

4. In your Spotify Developer Dashboard, add `http://127.0.0.1:3000/api/spotify/token` as a Redirect URI.

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

## App mode: real app vs. preview

Spotify's [Developer Policy](https://developer.spotify.com/policy) does not allow a
hosted third-party service to organize a user's library on their behalf — an app may
not "replicate or attempt to replace a core user experience of Spotify" (III.11), and
without extended quota mode only accounts the developer has explicitly added may use
the app at all. So the deployed build does not run the app: it serves a preview page
with screenshots and that explanation, and every Spotify/LLM route answers 403.

`NEXT_PUBLIC_APP_MODE` decides which build you get, falling back to `NODE_ENV` when
it is unset:

| Value | Result |
| --- | --- |
| `development` | The real app — login, playlist creation, all API routes live |
| anything else, or unset | Preview only — every route renders `src/components/preview/preview-landing.tsx` and the API routes return 403 |

It is a `NEXT_PUBLIC_*` variable, so it is inlined at build time: set it in the
hosting provider's environment **before** the build, not after.

The gate lives in three places, all reading `isPreviewMode` from `src/lib/app-mode.ts`:

- `src/app/layout.tsx` — renders the preview instead of `children`, so no page component runs
- `src/components/layouts/header.tsx` — swaps the Spotify login button for a "Preview" label
- `src/lib/preview-guard.ts` — `previewModeResponse()` short-circuits every API route

### Updating the preview screenshots

Images live in `public/screenshots/` and are listed in
`src/components/preview/screenshots.ts`. To add or refresh one, run the app locally
with `NEXT_PUBLIC_APP_MODE=development`, capture the page, drop the file in that
folder, and add an entry with its real pixel width and height. Visit `/preview` in
development to check the result without switching modes.


## How It Works

1. **Login** — Authenticate with Spotify via OAuth2 (tokens auto-refresh)
2. **Describe** — Enter a playlist name and a natural language prompt describing the music you want
3. **Parse** — Groq's LLM extracts structured parameters (mood, genres, era) from your prompt
4. **Search** — The app queries Spotify's search API with multiple genre+mood+era combinations, deduplicates results, and shuffles them
5. **Create** — A new playlist is created in your Spotify account and populated with the found tracks (10–50 configurable)

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Home — profile & playlists
│   ├── create/page.tsx          # Playlist creation form
│   └── api/
│       ├── parse-prompt/        # LLM prompt parsing
│       └── spotify/             # OAuth login, token, refresh
├── components/
│   ├── layouts/                 # Header with auth controls
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── spotify-auth.ts          # Client-side token management
│   ├── spotify-server.ts        # Server-side Spotify API calls
│   └── utils.ts
├── services/
│   ├── playlistService.ts       # Playlist creation logic
│   └── trackSearchService.ts    # Multi-query track search
└── types/                       # Shared TypeScript types
```
