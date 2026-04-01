/**
 * Builds the Spotify OAuth login URL.
 *
 * The browser redirects to an internal API route. That route constructs the
 * Spotify authorize URL on the server so the client secret never reaches the
 * browser bundle.
 */
export const getSpotifyAuthUrl = (): string => "/api/spotify/login";
