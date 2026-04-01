// ---- Spotify OAuth token endpoint responses ----
// Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-flow

// Successful response from POST https://accounts.spotify.com/api/token
export interface TokenIssueResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;   // omitted on some refresh responses
}

// Error response from the token endpoint (e.g. invalid code, bad credentials)
export interface TokenIssueErrorResponse {
  error: string;
  error_description: string;
}
