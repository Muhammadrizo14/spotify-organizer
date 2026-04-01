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
