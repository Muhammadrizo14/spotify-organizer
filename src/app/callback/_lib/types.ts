export interface TokenIssueResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export interface TokenIssueErrorResponse {
  error: string;
  error_description: string;
}
