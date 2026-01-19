# OAuth 2.0 Implementation & Token Management

## Overview

This app implements three OAuth connection methods to work seamlessly across web and mobile platforms, with secure token storage and refresh mechanisms.

## Token Storage Architecture

### Security by Platform

#### **Android/iOS (React Native)**
- Uses **react-native-keychain** for encrypted storage
- Tokens stored in OS-level Keychain (iOS) or Keystore (Android)
- Requires biometric or device passcode for access (optional, configurable)
- **Tokens are never stored as plain text**

#### **Web (Expo Web)**
- Falls back to **AsyncStorage** (localStorage equivalent)
- ⚠️ **WARNING**: localStorage is NOT secure for production web apps
- **Production web apps MUST use httpOnly cookies** managed by the backend
- httpOnly cookies are:
  - Not accessible to JavaScript (prevents XSS attacks)
  - Automatically sent with requests
  - Server-managed lifecycle
  - Protected by CSRF tokens

### Token Data Structure
```typescript
interface TokenData {
  accessToken: string;      // Short-lived, used for API requests
  refreshToken: string;     // Long-lived, used to get new access tokens
  expiresAt: number;       // Unix timestamp (milliseconds) when access token expires
  tokenType: string;       // Usually 'Bearer'
}
```

## Three OAuth Connection Methods

### Option 1: Short Code (Server-Generated)
**Best for:** Both mobile and web when users are in CetecERP browser

**Flow:**
1. User taps "Get Code" → App calls `POST /oauth/initiate`
2. Server generates unique short code (e.g., `ABC123DEF456`)
3. Server stores session with short code
4. App displays code in 3 ways (short code, QR code, deep link)
5. User enters code in CetecERP settings page
6. CetecERP redirects back with authorization
7. App polls or receives verification (via webhook/deep link)
8. Backend exchanges code for tokens
9. App stores tokens securely

**Advantages:**
- Works offline initially
- User has time to complete auth
- Code can be displayed in multiple formats
- No browser needed

**Disadvantages:**
- Requires polling or webhook for completion
- Extra step for user (manual code entry or scanning)

### Option 2: Browser OAuth (Seamless Login)
**Best for:** Web and mobile with modern browser integration

**Flow:**
1. User taps "Open Browser" → App opens browser
2. Browser opens: `https://cetecerp.com/oauth/authorize?client_id=...&redirect_uri=cetec://oauth/`
3. User logs in and authorizes app (if not already logged in)
4. CetecERP redirects to: `cetec://oauth/CODE`
5. App deep link listener intercepts redirect
6. App auto-switches to Settings, pre-populates code
7. User confirms by tapping "Verify & Connect"
8. App exchanges code for tokens

**Advantages:**
- Standard OAuth 2.0 Authorization Code flow
- No manual code entry needed
- Works seamlessly when user is in browser

**Disadvantages:**
- Requires browser/deep link support
- May not work if browser is not available
- Needs deep link configuration (iOS/Android)

**Web-Specific Implementation:**
```typescript
// On web, use redirect instead of deep link
if (Platform.OS === 'web') {
  window.location.href = `${CETEC_API_URL}/oauth/authorize?...`;
  // After authorization, CetecERP redirects back to:
  // https://yourapp.com/oauth-callback?code=...
  // App should handle callback and exchange for tokens
}
```

### Option 3: Manual Code Entry (Fallback)
**Best for:** Any platform, when other methods don't work

**Flow:**
1. User gets code from CetecERP (via any method)
2. User manually copies/pastes code in app
3. User taps "Verify & Connect"
4. App exchanges code for tokens
5. App stores tokens securely

**Advantages:**
- Works as universal fallback
- No browser required
- No deep link configuration needed

**Disadvantages:**
- Requires manual copy-paste
- More friction for users
- Easy to mistype or paste wrong code

## Token Refresh Flow

Tokens expire to improve security. When an access token expires:

```typescript
// When making API request:
const tokens = await tokenStorage.getTokens();

if (tokens && tokens.expiresAt < Date.now()) {
  // Access token expired, refresh it
  const newTokens = await oauthApi.refreshAccessToken(tokens.refreshToken);
  await tokenStorage.saveTokens({
    ...newTokens,
    expiresAt: Date.now() + (newTokens.expiresIn * 1000),
  });
}

// Use new access token for request
```

## Server-Side OAuth Endpoints

Your CetecERP backend should implement:

### 1. Initiate OAuth Session
```
POST /oauth/initiate
Content-Type: application/json

{
  "clientId": "cetec-time-logger",
  "platform": "mobile" | "web"
}

Response:
{
  "shortCode": "ABC123DEF456",
  "deepLink": "cetec://oauth/ABC123DEF456",
  "expiresIn": 600,
  "pollingUrl": "/oauth/status/ABC123DEF456"
}
```

### 2. Authorize Request (Browser OAuth)
```
GET /oauth/authorize?client_id=...&response_type=code&redirect_uri=...&scope=...&state=...

Redirects to:
{redirect_uri}?code=AUTH_CODE&state=...
```

### 3. Verify/Exchange Code for Tokens
```
POST /oauth/verify
Content-Type: application/json

{
  "code": "AUTH_CODE",
  "clientId": "cetec-time-logger"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### 4. Refresh Access Token
```
POST /oauth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc...",
  "clientId": "cetec-time-logger"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### 5. Check Authorization Status (Polling)
```
GET /oauth/status/{shortCode}

Response (if authorized):
{
  "authorized": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}

Response (if not yet authorized):
{
  "authorized": false,
  "expiresIn": 300
}
```

### 6. Revoke Tokens (Logout)
```
POST /oauth/revoke
Content-Type: application/json

{
  "refreshToken": "eyJhbGc...",
  "clientId": "cetec-time-logger"
}

Response: 200 OK
```

## Deep Link Configuration

### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>cetec</string>
    </array>
    <key>CFBundleURLName</key>
    <string>CetecOAuth</string>
  </dict>
</array>
```

### Android (AndroidManifest.xml)
```xml
<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="cetec" android:host="oauth" />
  </intent-filter>
</activity>
```

## Implementation Checklist

- [x] Token storage utility with platform-specific implementations
- [x] OAuth API service with 3 methods + refresh
- [x] Settings screen with 3 separate buttons
- [x] Deep link listener (App.tsx)
- [x] Secure token storage
- [ ] Server API endpoints implementation (your responsibility)
- [ ] Token refresh interceptor for API calls
- [ ] Token expiry monitoring and automatic refresh
- [ ] Web-specific oauth-callback page for browser OAuth
- [ ] iOS deep link configuration
- [ ] Android deep link configuration
- [ ] Error handling and recovery flows
- [ ] Token revocation on logout
- [ ] Session persistence across app restarts

## Security Best Practices

1. **Never log tokens** - Will appear in console/logs
2. **Always use HTTPS** - Even for OAuth endpoints
3. **Validate state parameter** - CSRF protection in browser OAuth
4. **Store refresh tokens securely** - Use Keychain/Keystore
5. **Short-lived access tokens** - 15-60 minutes ideal
6. **Long-lived refresh tokens** - Days or weeks
7. **Implement token rotation** - Issue new refresh token on refresh
8. **PKCE on mobile** - Use Proof Key for Code Exchange (mobile best practice)
9. **httpOnly cookies on web** - Never use localStorage for tokens in production
10. **Scope limitations** - Request only necessary scopes

## Testing OAuth Flows

### Local Testing
```typescript
// Mock token for testing
const mockTokens: TokenData = {
  accessToken: 'test-token',
  refreshToken: 'test-refresh',
  expiresAt: Date.now() + (3600 * 1000),
  tokenType: 'Bearer',
};

await tokenStorage.saveTokens(mockTokens);
```

### Deep Link Testing (iOS Simulator)
```bash
xcrun simctl openurl booted 'cetec://oauth/ABC123DEF456'
```

### Deep Link Testing (Android Emulator)
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d 'cetec://oauth/ABC123DEF456' com.cetectimelogger
```
