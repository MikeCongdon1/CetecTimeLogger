/**
 * OAuth API service for CetecERP authentication
 * Handles all OAuth flows and token management
 */

import * as cetecConfig from './cetecConfig';

interface OAuthInitiateResponse {
  shortCode: string;
  deepLink: string;
  expiresIn: number; // seconds
  pollingUrl?: string; // For polling-based verification
}

interface OAuthVerifyResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: string; // Usually 'Bearer'
}

interface OAuthRefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

async function getApiBaseUrl(): Promise<string> {
  const configuredUrl = await cetecConfig.getCetecUrl();
  if (!configuredUrl) {
    throw new Error('CetecERP URL not configured. Please set it in Settings.');
  }
  return configuredUrl.replace(/\/$/, '');
}

async function getClientCredentials(): Promise<{ clientId: string; clientSecret: string | null }> {
  const clientId = (await cetecConfig.getClientId()) ?? 'cetec-time-logger';
  const clientSecret = await cetecConfig.getClientSecret();
  return { clientId, clientSecret };
}

/**
 * OPTION 1: Server-initiated OAuth with short code
 * Flow: User clicks "Connect" → App calls API → Server generates code → App displays code
 * User then enters code in CetecERP or uses manual entry
 */
export async function initiateServerGeneratedCode(): Promise<OAuthInitiateResponse> {
  const baseUrl = await getApiBaseUrl();
  const { clientId, clientSecret } = await getClientCredentials();
  const response = await fetch(`${baseUrl}/oauth/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      ...(clientSecret && { clientSecret }),
      platform: 'mobile',
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth initiation failed: ${response.statusText}`);
  }

  const data: OAuthInitiateResponse = await response.json();
  return data;
}

/**
 * OPTION 2: Browser-initiated OAuth via redirect (Web only)
 * Flow: App opens browser → User logs in to CetecERP → CetecERP redirects back to app with code
 * User will need to authorize the app, then browser redirects to: cetec://oauth/CODE
 */
export async function initiateBrowserOAuth(redirectUri: string): Promise<string> {
  const baseUrl = await getApiBaseUrl();
  const { clientId } = await getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'timelog:write timelog:read',
    state: generateRandomState(),
  });

  const authUrl = `${baseUrl}/oauth/authorize?${params.toString()}`;
  
  // On web: window.location.href = authUrl
  // On native: Use react-native-inappbrowser-reborn or Linking.openURL
  
  return authUrl;
}

/**
 * OPTION 3: Manual code entry (Fallback for any platform)
 * Flow: User manually copies authorization code from CetecERP and pastes into app
 * Code is entered in the manual field and verified with this function
 */
export async function verifyManualAuthCode(authCode: string): Promise<OAuthVerifyResponse> {
  const baseUrl = await getApiBaseUrl();
  const { clientId, clientSecret } = await getClientCredentials();
  const response = await fetch(`${baseUrl}/oauth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: authCode,
      clientId,
      ...(clientSecret && { clientSecret }),
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth verification failed: ${response.statusText}`);
  }

  const data: OAuthVerifyResponse = await response.json();
  return data;
}

/**
 * Refresh access token using refresh token
 * Call this when access token is about to expire
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthRefreshResponse> {
  const baseUrl = await getApiBaseUrl();
  const { clientId, clientSecret } = await getClientCredentials();
  const response = await fetch(`${baseUrl}/oauth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken,
      clientId,
      ...(clientSecret && { clientSecret }),
    }),
  });

  if (!response.ok) {
    // If refresh fails, user needs to re-authenticate
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  const data: OAuthRefreshResponse = await response.json();
  return data;
}

/**
 * Revoke tokens and disconnect
 */
export async function revokeTokens(refreshToken: string): Promise<void> {
  try {
    const baseUrl = await getApiBaseUrl();
    const { clientId, clientSecret } = await getClientCredentials();
    const response = await fetch(`${baseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
        clientId,
        ...(clientSecret && { clientSecret }),
      }),
    });

    if (!response.ok) {
      console.warn(`Token revocation failed: ${response.statusText}`);
      // Don't throw - still clear local tokens even if server revocation fails
    }
  } catch (error) {
    console.error('Error revoking tokens:', error);
    // Don't throw - still clear local tokens even if revocation fails
  }
}

/**
 * Poll server to check if user has authorized the code
 * Used with Option 1 (short code flow) if server supports polling
 */
export async function pollAuthorizationStatus(shortCode: string): Promise<OAuthVerifyResponse> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/oauth/status/${shortCode}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Helper: Generate random state for CSRF protection
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
