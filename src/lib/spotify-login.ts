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
