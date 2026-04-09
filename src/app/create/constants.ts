export const SPOTIFY_SEED_GENRES = [
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

export const VALID_MOODS = [
  "chill", "hype", "sad", "romantic", "angry",
  "upbeat", "dark", "mellow", "energetic", "peaceful",
] as const;

export const VALID_ERAS = [
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",
] as const;

export const VALID_TEMPOS = ["slow", "medium", "fast"] as const;

export const VALID_SOURCES = ["new", "saved", "mix"] as const;

export type Mood = typeof VALID_MOODS[number];
export type Era = typeof VALID_ERAS[number];
export type Tempo = typeof VALID_TEMPOS[number];
export type Source = typeof VALID_SOURCES[number];
