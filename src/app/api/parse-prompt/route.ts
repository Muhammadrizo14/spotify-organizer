/**
 * /api/parse-prompt — API route that converts a natural language prompt into structured playlist settings.
 *
 * FLOW:
 * 1. Receives POST { prompt: "old rock" } from the create form
 * 2. Sends the prompt to Groq (LLM) with a system prompt that defines the output JSON shape
 * 3. Groq returns JSON with mood, genres, energy, tempo, era, source
 * 4. This route NORMALIZES the response (the LLM doesn't always follow instructions perfectly):
 *    - Genres are validated against the official Spotify seed genre list
 *    - Mood is validated against the allowed list (falls back to "energetic")
 *    - Era decades are validated (falls back to ["2010s","2020s"])
 *    - Energy is clamped to 0.0–1.0
 * 5. Returns the cleaned settings JSON to the client
 *
 * WHY NORMALIZATION IS NEEDED:
 * The LLM sometimes returns genres like "Classic Rock" instead of "rock",
 * or mood "rebellious" instead of one from the allowed list.
 * Without normalization, these invalid values cause Spotify search to return 0 results.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ---- Groq client (uses OpenAI-compatible API) ----
// Groq provides fast inference for open-source LLMs.
// We use the OpenAI SDK because Groq's API is OpenAI-compatible.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,          // set in .env.local
  baseURL: "https://api.groq.com/openai/v1",
});

// ---- Allowed values for validation ----

// Moods the LLM should pick from. If it picks something else, we default to "energetic".
const VALID_MOODS = [
  "chill", "hype", "sad", "romantic", "angry",
  "upbeat", "dark", "mellow", "energetic", "peaceful",
] as const;

// Decades used for year-range search queries. Must match ERA_YEAR_RANGES in spotify-tracks.service.ts.
const VALID_ERAS = [
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",
] as const;

// Official Spotify seed genre slugs. The LLM MUST return genres from this list.
// Full list from: https://developer.spotify.com/documentation/web-api/reference/get-recommendation-genres
// If the LLM returns something not in this list (e.g. "Classic Rock"), we try to normalize it
// (e.g. "Classic Rock" → "classic-rock" → not in list → fuzzy match → no match → error).
const SPOTIFY_SEED_GENRES = [
  "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime",
  "black-metal", "bluegrass", "blues", "bossanova", "brazil", "breakbeat",
  "british", "cantopop", "chicago-house", "children", "chill", "classical",
  "club", "comedy", "country", "dance", "dancehall", "death-metal",
  "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass", "dub",
  "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french",
  "funk", "garage", "german", "gospel", "goth", "grindcore", "groove",
  "grunge", "guitar", "happy", "hard-rock", "hardcore", "hardstyle",
  "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm",
  "indian", "indie", "indie-pop", "industrial", "iranian", "j-dance",
  "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin",
  "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore",
  "minimal-techno", "movies", "mpb", "new-age", "new-release", "opera",
  "pagode", "party", "philippines-opm", "piano", "pop", "pop-film",
  "post-dubstep", "power-pop", "progressive-house", "psych-rock", "punk",
  "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip",
  "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba",
  "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep",
  "songwriter", "soul", "soundtracks", "spanish", "study", "summer",
  "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop",
  "turkish", "work-out", "world-music",
] as const;

// ---- System prompt sent to the LLM ----
// This tells the LLM exactly what JSON shape to return and what values are valid.
// The full genre list is included so the LLM picks valid Spotify slugs.
const SYSTEM_PROMPT = `
You are a music playlist settings parser. Given a user's natural language description of a playlist, extract structured settings as JSON.

Output EXACTLY this JSON shape (no extra keys):
{
  "mood": string,
  "genres": string[],
  "energy": number,
  "tempo": string,
  "era": string[],
  "source": string
}

Rules:

- mood:
  Choose ONE from: "chill", "hype", "sad", "romantic", "angry", "upbeat", "dark", "mellow", "energetic", "peaceful"
  Always map to the closest emotional intent.

- genres:
  Select 1–3 ONLY from this exact list (use these exact strings, lowercase with hyphens):
  acoustic, afrobeat, alt-rock, alternative, ambient, anime, black-metal, bluegrass, blues, bossanova, brazil, breakbeat, british, cantopop, chicago-house, children, chill, classical, club, comedy, country, dance, dancehall, death-metal, deep-house, detroit-techno, disco, disney, drum-and-bass, dub, dubstep, edm, electro, electronic, emo, folk, forro, french, funk, garage, german, gospel, goth, grindcore, groove, grunge, guitar, happy, hard-rock, hardcore, hardstyle, heavy-metal, hip-hop, holidays, honky-tonk, house, idm, indian, indie, indie-pop, industrial, iranian, j-dance, j-idol, j-pop, j-rock, jazz, k-pop, kids, latin, latino, malay, mandopop, metal, metal-misc, metalcore, minimal-techno, movies, mpb, new-age, new-release, opera, pagode, party, philippines-opm, piano, pop, pop-film, post-dubstep, power-pop, progressive-house, psych-rock, punk, punk-rock, r-n-b, rainy-day, reggae, reggaeton, road-trip, rock, rock-n-roll, rockabilly, romance, sad, salsa, samba, sertanejo, show-tunes, singer-songwriter, ska, sleep, songwriter, soul, soundtracks, spanish, study, summer, swedish, synth-pop, tango, techno, trance, trip-hop, turkish, work-out, world-music
  NEVER output genres outside this list.

- energy:
  Value from 0.0 to 1.0 based on intensity:
    0.0–0.3 = very calm / sad / ambient
    0.4–0.6 = moderate / chill / groovy
    0.7–1.0 = intense / hype / aggressive

- tempo:
  "slow" (<100 BPM), "medium" (100–130 BPM), "fast" (>130 BPM)
  Interpret phrases like:
    "not too slow" → medium
    "fast-paced" → fast
    "laid back" → slow

- era:
  Map user intent to ONLY these values: ["1960s","1970s","1980s","1990s","2000s","2010s","2020s"]
  Examples:
    "old" or "old school" → ["1960s","1970s","1980s"]
    "retro" → ["1980s","1990s"]
    "modern" → ["2010s","2020s"]
  If unspecified, default to ["2010s","2020s"]

- source:
  "new" = recommendations only
  "saved" = user's library only
  "mix" = both
  Detect phrases like:
    "my music", "my songs" → saved
    "mix of old and new", "blend" → mix
  Default to "new" if unclear.

Output must be valid JSON only. No explanations.
`;

// ---- Error helpers ----

/** Checks if an error is a rate limit / quota error from the Groq API */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("rate") || msg.includes("429") || msg.includes("quota") || msg.includes("limit");
  }
  return false;
}

/**
 * Extracts the HTTP status code from an error.
 * The OpenAI SDK (used for Groq) throws errors with a `status` property.
 * We forward this status to the client so error toasts are more meaningful.
 */
function extractErrorStatus(error: unknown): number {
  if (error && typeof error === "object" && "status" in error && typeof (error as any).status === "number") {
    return (error as any).status;
  }
  if (isRateLimitError(error)) return 429;
  return 500;
}

/** Converts an error into a user-friendly message string */
function extractError(error: unknown): string {
  if (error instanceof Error) {
    if (isRateLimitError(error)) {
      return "Groq API rate limit reached. Please wait a moment and try again.";
    }
    if (error.message.includes("API key") || error.message.includes("401") || error.message.includes("403")) {
      return "Groq API key is invalid or missing. Get a free key at console.groq.com.";
    }
    return error.message;
  }
  return "Failed to parse prompt";
}

// ---- Route handler ----

export async function POST(req: NextRequest) {
  try {
    // Extract the prompt from the request body
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Call Groq LLM to parse the prompt into structured settings
    // response_format: json_object ensures the LLM returns valid JSON
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,   // low temperature = more deterministic/consistent output
    });

    // Extract the JSON string from the LLM response
    const text = response.choices[0]?.message?.content ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Groq returned an empty response. Try rephrasing your prompt." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text);

    // ---- Validate basic shape ----
    // The LLM should return an object with mood (string) and genres (array)
    if (!parsed || typeof parsed.mood !== "string" || !Array.isArray(parsed.genres)) {
      console.error("Groq returned invalid shape:", parsed);
      return NextResponse.json(
        { error: "Could not understand your prompt. Try being more specific (e.g. \"upbeat 80s rock\")." },
        { status: 422 }
      );
    }

    // ---- Normalize genres ----
    // Convert LLM output to lowercase+hyphens and check against the valid Spotify genre list.
    // e.g. "Classic Rock" → "classic-rock" → check if it's in SPOTIFY_SEED_GENRES
    const genreSet = new Set<string>(SPOTIFY_SEED_GENRES);
    const normalizedGenres = parsed.genres
      .map((g: string) => g.toLowerCase().replace(/\s+/g, "-"))
      .filter((g: string) => genreSet.has(g));

    // If direct matching failed, try fuzzy matching (substring match)
    // e.g. "rock-and-roll" contains "rock" → match to "rock"
    if (normalizedGenres.length === 0) {
      for (const raw of parsed.genres as string[]) {
        const lower = raw.toLowerCase().replace(/\s+/g, "-");
        const match = SPOTIFY_SEED_GENRES.find(
          (g) => g.includes(lower) || lower.includes(g)
        );
        if (match) normalizedGenres.push(match);
      }
    }

    // If we still couldn't map to any valid genre, return an error
    if (normalizedGenres.length === 0) {
      return NextResponse.json(
        { error: "Could not map your prompt to valid Spotify genres. Try something like \"80s rock\" or \"chill hip-hop\"." },
        { status: 422 }
      );
    }

    // ---- Normalize mood ----
    // If the LLM returned an invalid mood (e.g. "rebellious"), default to "energetic"
    const moodSet = new Set<string>(VALID_MOODS);
    const normalizedMood = moodSet.has(parsed.mood.toLowerCase())
      ? parsed.mood.toLowerCase()
      : "energetic";

    // ---- Normalize era ----
    // Filter out any era values not in our valid list (e.g. "1950s" would be dropped)
    const eraSet = new Set<string>(VALID_ERAS);
    const normalizedEra = Array.isArray(parsed.era)
      ? parsed.era.filter((e: string) => eraSet.has(e))
      : [];

    // ---- Normalize energy ----
    // LLM sometimes returns 80 instead of 0.8 — convert to 0.0–1.0 range
    let energy = typeof parsed.energy === "number" ? parsed.energy : 0.5;
    if (energy > 1) energy = energy / 100;

    // ---- Build the final cleaned result ----
    const result = {
      mood: normalizedMood,
      genres: normalizedGenres.slice(0, 3),    // max 3 genres
      energy,
      tempo: ["slow", "medium", "fast"].includes(parsed.tempo) ? parsed.tempo : "medium",
      era: normalizedEra.length > 0 ? normalizedEra : ["2010s", "2020s"],  // default to modern
      source: ["new", "saved", "mix"].includes(parsed.source) ? parsed.source : "new",
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Groq parse error:", error);

    const message = extractError(error);
    const status = extractErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }
}
