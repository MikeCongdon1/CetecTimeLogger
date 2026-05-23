/**
 * OAuth and Token Types
 */

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  tokenType: string; // Usually 'Bearer'
}

export interface ClientCredentials {
  clientId: string;
  clientSecret?: string;
}

export interface OAuthInitiateResponse {
  shortCode: string;
  deepLink: string;
  expiresIn: number; // seconds
  pollingUrl?: string;
}

export interface OAuthVerifyResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: string;
}

export interface OAuthRefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
}
