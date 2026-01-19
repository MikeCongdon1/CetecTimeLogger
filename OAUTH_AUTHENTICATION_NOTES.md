# OAuth Authentication Implementation Notes

## Current Implementation

The mobile app implements OAuth authentication with CetecERP by using refresh tokens (API keys) to authenticate requests.

### How It Works

1. **Token Storage**: Users generate a refresh token (API key) in CetecERP and store it in the mobile app
2. **Token Authentication**: When calling API endpoints, the app passes the token via Authorization header with Bearer format
3. **Endpoint Access**: The token grants access to `/goapis/api/v1/user/me` and other protected endpoints

### Request Format

The token must be passed via the `Authorization` header with Bearer scheme:

```javascript
fetch(`${cetecUrl}/goapis/api/v1/user/me`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Middleware Processing (Go Backend - api.go)

In `api.go`, the `APIGetOAuthToken` function processes OAuth authentication as follows:

```go
// 1. Check for tokens in cookies first (access_token, refresh_token)
oauthToken, err := c.Cookie("access_token")
refreshToken, err := c.Cookie("refresh_token")

// 2. If no tokens in cookies, check Authorization header
if oauthToken == "" {
  oauthToken = c.Request.Header.Get("Authorization")
  parts := strings.SplitN(oauthToken, " ", 2)
  if len(parts) == 2 && parts[0] == "Bearer" {
    oauthToken = parts[1]
  }
}

// 3. Decrypt and validate the access token
tokenPayload, err := models.DecryptAccessToken(db, oauthToken)

// 4. Check token expiration
expiredAt, _ := time.Parse("2006-01-02 15:04:05", tokenPayload.ExpiredAt)
if expiredAt.Before(time.Now()) {
  // Token expired, should refresh
}

// 5. Check if token is revoked
tokenInfo, err := models.GetTokenByAccessToken(db, oauthToken)
if tokenInfo.Revoked {
  return false, fmt.Errorf("token expired please generate a new token")
}

// 6. If token expired but refresh_token available, automatically refresh
if oauthToken == "" && refreshToken != "" {
  tokenPayload, err := models.RefreshToken(db, refreshToken)
  oauthToken = tokenPayload.AccessToken
}

// 7. Check IP authorization (optional blocked IPs list)
clientIP := GetClientIP(c)
// Check against oauth_restricted_ips config

// 8. Track token usage in UserTokenHistory
```

**Token Validation Flow:**
1. Prefer access_token from cookies if valid and not expired
2. Fall back to Authorization header Bearer token
3. If access_token expired but refresh_token available, auto-refresh
4. Validate token hasn't been revoked
5. Check IP restrictions
6. Set user in context and update token history

## Mobile App Implementation

### SettingsScreen.tsx - handleAttemptConnection

The `handleAttemptConnection` function:

1. Retrieves the stored refresh token from the database
2. Calls `/goapis/api/v1/user/me` with the token in Authorization header
3. On success, updates the connection status and stores user information
4. On failure, displays appropriate error messages

```typescript
// Authorization header with Bearer format
const userResponse = await fetch(
  `${cetecUrl}/goapis/api/v1/user/me`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${refreshToken}`
    }
  }
);
```

### Why Authorization Header?

- **Standard OAuth Pattern**: Bearer tokens in Authorization header is the OAuth 2.0 standard
- **Backend Implementation**: `api.go` explicitly checks for "Bearer" format in Authorization header
- **Security**: Cleaner than query parameters which may be logged in URLs
- **Automatic Refresh**: Backend automatically refreshes expired tokens using the refresh_token if available
- **Token History**: Backend tracks token usage in UserTokenHistory table

## Token Lifecycle (api.go)

### Access Token Validation
- Decrypted and payload checked
- Expiration time validated
- Revocation status checked
- Auto-refresh if expired but refresh_token present

### Refresh Token Validation
- Decrypted
- TokenID extracted
- Checked against RefreshTokenByTokenID table
- Used to generate new access_token if needed

### Automatic Refresh Logic
```
If access_token is empty AND refresh_token exists:
  1. Decrypt refresh_token
  2. Call models.RefreshToken() to get new access_token
  3. Set new tokens in cookies
  4. Continue with request
```

### IP Restriction
- Checks `oauth_restricted_ips` configuration
- Can block specific IPs from OAuth flows
- Throws "IP is not Authorized" error if blocked

### Token History Tracking
- Creates or updates UserTokenHistory on each token use
- Tracks: TokenID, URL path, timestamp, client IP
- Useful for audit logging and security monitoring

## Error Scenarios

### 401 Unauthorized
- Token is invalid or revoked
- Token has expired and no valid refresh_token
- IP is in restricted list

### Token Expired
- Access token expiration time has passed
- Backend will attempt auto-refresh if refresh_token available
- If refresh fails, request fails with 401

### Missing Token
- No access_token in cookies
- No Authorization header provided
- No refresh_token to auto-refresh

## Recommendations for Mobile App

### 1. Store Both Access and Refresh Tokens
Currently only storing refresh token. Consider storing both:
```typescript
interface StoredTokens {
  accessToken: string;      // Short-lived, auto-refreshed
  refreshToken: string;     // Long-lived, used for refresh
  expiresAt: number;        // Unix timestamp
  tokenType: "Bearer";
}
```

### 2. Implement Token Caching
- Store access_token locally to avoid unnecessary requests
- Check expiration before each API call
- Only refresh when needed

### 3. Add Automatic Token Refresh
- Catch 401 responses and attempt refresh
- Retry original request with new token
- Queue requests while refreshing

### 4. Handle Token Refresh Failure
- Clear stored tokens
- Redirect user back to Settings screen
- Show message: "Session expired, please reconnect"

### 5. Secure Token Storage
- **iOS**: Use Keychain via `@react-native-keychain`
- **Android**: Use Keystore via `@react-native-keychain`
- **Web**: Use secure httpOnly cookies (server-side preference)

### 6. Monitor Token History
- Backend tracks all token usage
- Check logs for suspicious patterns
- Can implement additional security checks

## Testing Checklist

- [ ] Store valid refresh token
- [ ] Call `/goapis/api/v1/user/me` with Bearer token
- [ ] Verify user data is returned correctly
- [ ] Test with invalid token (expect 401)
- [ ] Test with expired token (check auto-refresh behavior)
- [ ] Test with missing Authorization header (expect 401)
- [ ] Verify tokens persist across app restarts
- [ ] Test from different IP addresses (if restrictions configured)
- [ ] Verify token history is being tracked
- [ ] Check error messages on connection failure

## Backend Configuration

### oauth_restricted_ips
Configuration option in database to block specific IPs:
```
Name: oauth_restricted_ips
Value: "192.168.1.1,10.0.0.1"  (comma-separated IPs)
```

### Token Encryption/Decryption
- Tokens are encrypted in database using models.DecryptAccessToken/RefreshToken
- Ensure encryption keys are properly configured
- Token payload includes: UserID, ExpiredAt, TokenID

## Future Enhancements

1. **Implement Token Caching**: Reduce API calls by caching valid access tokens
2. **Automatic Token Refresh**: Queue requests while refreshing token
3. **Biometric Authentication**: Use fingerprint/face for stored tokens
4. **Token Rotation**: Regularly rotate tokens for enhanced security
5. **Certificate Pinning**: Pin SSL certificates on mobile platforms
6. **Offline Support**: Store limited offline token state

