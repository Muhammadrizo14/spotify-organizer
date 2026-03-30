// ---- Spotify OAuth token endpoint responses ----
// Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-flow

// Successful response from POST https://accounts.spotify.com/api/token
export interface TokenIssueResponse {
  access_token: string;    // Bearer token for Spotify API calls (expires in `expires_in` seconds)
  token_type: string;      // always "Bearer"
  scope: string;           // space-separated list of granted scopes
  expires_in: number;      // token lifetime in seconds (usually 3600 = 1 hour)
  refresh_token: string;   // long-lived token used to get a new access_token when it expires
}

// Error response from the token endpoint (e.g. invalid code, bad credentials)
export interface TokenIssueErrorResponse {
  error: string;                // e.g. "invalid_grant"
  error_description: string;    // human-readable message, e.g. "Authorization code expired"
}
