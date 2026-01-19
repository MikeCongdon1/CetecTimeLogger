# Quick Reference: OAuth Implementation

## Three Buttons in Settings

### Option 1: Short Code 🔵
**Primary Color (Blue)**
- Server generates code
- User enters in CetecERP
- Works: Mobile & Web
- Best for: Desktop + Mobile combo
- Button: "Get Code"

### Option 2: Browser OAuth 🔷
**Secondary Color (Light Blue)**
- Opens CetecERP in browser
- Browser logs in → app redirects
- Works: Mostly Web
- Best for: Seamless web experience
- Button: "Open Browser"

### Option 3: Manual Entry 🟣
**Tertiary Color (Purple)**
- User copy-pastes code
- Works: Any platform
- Best for: Fallback/troubleshooting
- Button: "Verify & Connect"

---

## URL Configuration

**Location:** Settings → CetecERP Instance (top section)

**States:**
- ❌ Not Configured → Button: "Configure URL"
- ✅ Configured → Button: "Change URL"
- ✏️ Editing → Two buttons: "Save" & "Cancel"

**Example:**
```
http://l418.cetecerpdevel.com:3030
```

---

## Token Storage

| Platform | Storage | Security |
|----------|---------|----------|
| iOS | Keychain | 🔒 Encrypted |
| Android | Keystore | 🔒 Encrypted |
| Web | AsyncStorage | ⚠️ Plain text |

**To Use in App:**
```typescript
import * as tokenStorage from '@/utils/tokenStorage';

// Save
await tokenStorage.saveTokens({
  accessToken: '...',
  refreshToken: '...',
  expiresAt: timestamp,
  tokenType: 'Bearer'
});

// Get
const tokens = await tokenStorage.getTokens();

// Clear
await tokenStorage.clearTokens();
```

---

## API Endpoints Needed

```
POST /oauth/initiate
→ {shortCode, deepLink, expiresIn}

GET /oauth/authorize?...
→ Redirect browser

POST /oauth/verify
→ {accessToken, refreshToken, expiresIn}

POST /oauth/refresh
→ {accessToken, expiresIn}

POST /oauth/revoke
→ 200 OK

GET /oauth/status/{code}
→ {authorized, ...tokens}
```

---

## Connection States

```
Settings Screen:

NOT CONNECTED
├─ No URL → Can't connect
├─ Has URL → Choose from 3 options
└─ Click option → OAuth flow starts

OAUTH ACTIVE
├─ Show code/QR/manual tabs
├─ User completes auth
└─ Click Verify → Get tokens

CONNECTED
├─ Show user email
├─ Show "Disconnect" button
└─ Tokens stored securely
```

---

## Error Handling

**No URL:**
```
Alert: "Configuration Required"
Action: Auto-switch to URL edit mode
```

**Invalid URL:**
```
Alert: "Invalid URL format. Please enter a valid URL."
Action: Stay in edit mode
```

**API Error:**
```
Alert: "Failed to initiate connection. Please try again."
Action: Can retry
```

---

## Files to Know

| File | Purpose |
|------|---------|
| `tokenStorage.ts` | Secure token save/load |
| `cetecConfig.ts` | URL configuration |
| `oauthApi.ts` | OAuth API calls |
| `SettingsScreen.tsx` | UI with 3 buttons |

---

## Testing URLs

```
Development:
http://localhost:3030
http://l418.cetecerpdevel.com:3030

Staging:
https://staging.cetecerp.com

Production:
https://api.cetecerp.com
```

---

## Key Components

### Settings Screen
- ✅ CetecERP Instance section (top)
- ✅ 3 OAuth option cards
- ✅ Connected state display
- ✅ Disconnect button

### Token Management
- ✅ Encrypted storage (mobile)
- ✅ Automatic expiry detection
- ✅ Clear on logout
- ✅ Refresh support

### OAuth Methods
- ✅ Option 1: Server code generation
- ✅ Option 2: Browser authorization
- ✅ Option 3: Manual entry fallback

---

## User Flow

```
1. Open Settings
   ↓
2. "Configure URL" section appears
   ↓
3. Enter: http://l418.cetecerpdevel.com:3030
   ↓
4. Tap Save
   ↓
5. Three options appear:
   - Get Code
   - Open Browser  
   - Verify & Connect
   ↓
6. Choose one → Complete auth
   ↓
7. Tokens saved securely
   ↓
8. Status: Connected ✅
```

---

## Security Checklist

- ✅ Access tokens NOT logged
- ✅ Refresh tokens encrypted on mobile
- ✅ Tokens cleared on logout
- ✅ URL validated before save
- ✅ Errors don't leak sensitive data
- ⚠️ Web: Use httpOnly cookies in production
- ⚠️ Enforce HTTPS for all API calls

---

## Next Steps

1. **Server Setup** - Implement OAuth endpoints
2. **Testing** - Test with your CetecERP instance
3. **Deep Links** - Configure iOS/Android URL schemes
4. **Web Callback** - Create `/oauth-callback` page
5. **Token Refresh** - Implement auto-refresh logic
6. **Error Recovery** - Add retry logic for failed auth

---

## Common Tasks

**Test Option 1:**
```
1. Configure URL
2. Tap "Get Code"
3. Copy code to CetecERP
4. Enter in manual field
5. Tap "Verify & Connect"
```

**Test Option 2:**
```
1. Configure URL
2. Tap "Open Browser"
3. Log in to CetecERP
4. Authorize app
5. Browser redirects → auto-fill manual field
6. Tap "Verify & Connect"
```

**Test Option 3:**
```
1. Configure URL
2. Get code from somewhere
3. Paste in manual field
4. Tap "Verify & Connect"
```

**Change URL:**
```
1. Tap "Change URL"
2. Edit URL
3. Tap "Save"
4. Try connecting again
```

**Disconnect:**
```
1. Tap "Disconnect"
2. Confirm
3. Tokens cleared
4. Back to "Not Connected" state
```

---

## Documentation

See `.github/` folder:
- `IMPLEMENTATION_COMPLETE.md` - Full overview
- `OAUTH_IMPLEMENTATION.md` - API specification
- `CETEC_URL_CONFIG.md` - URL configuration details
- `OAUTH_FLOW_DIAGRAM.md` - Visual flows

---

**Status:** ✅ Implementation Complete
**Ready for:** Server integration & testing
