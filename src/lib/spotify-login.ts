/**
 * Builds the Spotify OAuth authorization URL.
 *
 * When the user clicks "Login with Spotify", the browser is redirected to this URL.
 * Spotify shows a consent screen, then redirects back to /callback with an
 * authorization code in the query string (?code=...).
 *
 * The scopes requested here determine what API endpoints the token can access:
 *  - user-read-private, user-read-email  → read user profile
 *  - playlist-read-*                     → list user's playlists on the home page
 *  - playlist-modify-*                   → create playlists and add tracks
 *  - user-library-read                   → read liked/saved songs (for "include saved music" feature)
 *  - ugc-image-upload                    → (reserved) upload custom playlist cover images
 */
export const getSpotifyAuthUrl = (): string => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    scope:
      "user-read-private user-read-email " +
      "playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public " +
      "ugc-image-upload user-library-read",
    redirect_uri: "http://127.0.0.1:3000/callback",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};
