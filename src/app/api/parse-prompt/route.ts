import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a music playlist settings parser. Given a user's natural language description of a playlist, extract structured settings as JSON.

Output EXACTLY this JSON shape (no extra keys):
{
  "mood": string,        // one word: "chill", "hype", "sad", "romantic", "angry", "upbeat", "dark", "mellow", "energetic", "peaceful"
  "genres": string[],    // 1-3 Spotify genre seeds from this list: acoustic, afrobeat, alt-rock, alternative, ambient, anime, black-metal, bluegrass, blues, bossanova, brazil, breakbeat, british, cantopop, chicago-house, children, chill, classical, club, comedy, country, dance, dancehall, death-metal, deep-house, detroit-techno, disco, disney, drum-and-bass, dub, dubstep, edm, electro, electronic, emo, folk, forro, french, funk, garage, german, gospel, goth, grindcore, groove, grunge, guitar, happy, hard-rock, hardcore, hardstyle, heavy-metal, hip-hop, holidays, honky-tonk, house, idm, indian, indie, indie-pop, industrial, iranian, j-dance, j-idol, j-pop, j-rock, jazz, k-pop, kids, latin, latino, malay, mandopop, metal, metal-misc, metalcore, minimal-techno, movies, mpb, new-age, new-release, opera, pagode, party, philippines-opm, piano, pop, pop-film, post-dubstep, power-pop, progressive-house, psych-rock, punk, punk-rock, r-n-b, rainy-day, reggae, reggaeton, road-trip, rock, rock-n-roll, rockabilly, romance, sad, salsa, samba, sertanejo, show-tunes, singer-songwriter, ska, sleep, songwriter, soul, soundtracks, spanish, study, summer, swedish, synth-pop, tango, techno, trance, trip-hop, turkish, work-out, world-music
  "energy": number,      // 0.0 to 1.0
  "tempo": string,       // "slow" (<100 BPM), "medium" (100-130 BPM), or "fast" (>130 BPM)
  "era": string[],       // subset of: ["1960s","1970s","1980s","1990s","2000s","2010s","2020s"]
  "source": string       // "new" (only recommendations), "saved" (only user library), or "mix" (both)
}

Examples:
Input: "chill night drive, some r&b, not too slow, mix of old and new"
Output: {"mood":"chill","genres":["r-n-b","soul"],"energy":0.4,"tempo":"medium","era":["2000s","2010s","2020s"],"source":"mix"}

Input: "pump up gym playlist, heavy bass, EDM and hip hop"
Output: {"mood":"energetic","genres":["edm","hip-hop"],"energy":0.9,"tempo":"fast","era":["2010s","2020s"],"source":"new"}

Input: "sad rainy day, acoustic indie, slow"
Output: {"mood":"sad","genres":["indie","acoustic","rainy-day"],"energy":0.2,"tempo":"slow","era":["2010s","2020s"],"source":"new"}

If the user doesn't mention mixing in saved music, default source to "new".
If the user doesn't mention an era, default to ["2010s","2020s"].
Always output valid JSON only, no markdown fences.`;

function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("quota") || msg.includes("rate") || msg.includes("429") || msg.includes("resource_exhausted");
  }
  return false;
}

function extractGeminiError(error: unknown): string {
  if (error instanceof Error) {
    if (isQuotaError(error)) {
      return "Gemini API quota exceeded. Please wait a moment and try again.";
    }
    if (error.message.includes("API_KEY") || error.message.includes("401") || error.message.includes("403")) {
      return "Gemini API key is invalid or missing.";
    }
    return error.message;
  }
  return "Failed to parse prompt";
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Gemini parse error:", error);

    const message = extractGeminiError(error);
    const status = isQuotaError(error) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
