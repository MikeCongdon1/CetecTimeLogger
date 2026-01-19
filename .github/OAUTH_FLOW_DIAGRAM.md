# Complete OAuth Implementation Overview

## Settings Screen Layout

```
┌─────────────────────────────────────────┐
│           Settings                       │
│    Manage your preferences              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  CetecERP Instance                      │
├─────────────────────────────────────────┤
│  [Display Mode - No URL Configured]     │
│                                          │
│  "No CetecERP instance configured.      │
│   Configure one to start connecting."   │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │    Configure URL                 │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  [OR - Display Mode - URL Configured]   │
│                                          │
│  Configured URL                         │
│  http://l418.cetecerpdevel.com:3030    │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │    Change URL                    │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  [OR - Edit Mode]                       │
│                                          │
│  CetecERP Server URL                    │
│  Example: http://l418.cetecerpdevel... │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │ http://my.cetecerp.com:3030      │  │
│  └──────────────────────────────────┘  │
│                                          │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │      Save       │  │    Cancel    │ │
│  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ERP Connection                         │
├─────────────────────────────────────────┤
│  [Status: Not Connected]                │
│  ● Not Connected                        │
│                                          │
│  "Choose how you'd like to connect to   │
│   CetecERP:"                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Option 1: Short Code                   │
│  ───────────────────────────────────    │
│  "Get a code and enter it in your      │
│   CetecERP settings. Works on any      │
│   platform."                            │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │        Get Code                  │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Option 2: Browser Login                │
│  ────────────────────────────────────── │
│  "Opens CetecERP in your browser for   │
│   seamless authentication. Recommended │
│   on web."                              │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │      Open Browser                │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Option 3: Manual Entry                 │
│  ────────────────────────────────────── │
│  "Paste a code from CetecERP. Use this │
│   as a fallback if other methods don't  │
│   work."                                │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │ Paste code here...               │  │
│  └──────────────────────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │    Verify & Connect              │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

[After successful connection...]

┌─────────────────────────────────────────┐
│  ERP Connection                         │
├─────────────────────────────────────────┤
│  ● Connected                            │
│                                          │
│  Connected as                           │
│  User@example.com                       │
│                                          │
│  "Your account is synced with CetecERP.│
│   Time entries will be automatically   │
│   synced."                              │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │      Disconnect                  │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## OAuth Flow by Option

### Option 1: Short Code (Server-Generated)
```
User Taps "Get Code"
        ↓
Check URL configured? → No → Alert → Edit mode
        ↓ Yes
POST {cetecUrl}/oauth/initiate
        ↓
Response: {
  shortCode: "ABC123DEF456",
  deepLink: "cetec://oauth/ABC123DEF456",
  expiresIn: 600
}
        ↓
App shows 3 tabs:
  1. Short Code tab → Display code, copy button
  2. QR Code tab → Render QR code
  3. Deep Link tab → Deep link info
        ↓
User enters code in CetecERP
        ↓
[Server verifies user authorized code]
        ↓
User gets tokens
```

### Option 2: Browser OAuth
```
User Taps "Open Browser"
        ↓
Check URL configured? → No → Alert → Edit mode
        ↓ Yes
Build OAuth URL:
{cetecUrl}/oauth/authorize?
  client_id=cetec-time-logger&
  response_type=code&
  redirect_uri=cetec://oauth/&
  scope=timelog:read,timelog:write&
  state=random_value
        ↓
Open in browser
        ↓
User logs in & authorizes
        ↓
Browser redirects to: cetec://oauth/CODE
        ↓
Deep link listener catches it
        ↓
App.tsx receives code
        ↓
Auto-navigate to Settings
        ↓
Pre-populate manual field
        ↓
User confirms "Verify & Connect"
        ↓
Exchange code for tokens
```

### Option 3: Manual Entry
```
User has code from CetecERP
        ↓
User enters Settings
        ↓
Taps "Verify & Connect"
        ↓
Check URL configured? → No → Alert → Edit mode
        ↓ Yes
User pastes code in text field
        ↓
POST {cetecUrl}/oauth/verify
{
  code: "USER_CODE",
  clientId: "cetec-time-logger"
}
        ↓
Response: {
  accessToken: "...",
  refreshToken: "...",
  expiresIn: 3600
}
        ↓
Store tokens securely
        ↓
Update connection status → Connected
```

## Token Storage

### On React Native (Mobile)
```
Token Data
  ├─ accessToken: "eyJhbGc..."
  ├─ refreshToken: "eyJhbGc..."
  ├─ expiresAt: 1735389600000
  └─ tokenType: "Bearer"
        ↓
Encrypted by react-native-keychain
        ↓
Device Keychain/Keystore
(OS-level encryption)
```

### On Web (Expo Web)
```
⚠️  Falls back to AsyncStorage
(localStorage equivalent)

Production app MUST use httpOnly cookies
instead of localStorage!
```

## Secure Refresh Flow

```
[When making API request with accessToken]
        ↓
Is token expired?
  ├─ Yes → POST /oauth/refresh
  │         with refreshToken
  │         ↓
  │         Get new accessToken
  │         ↓
  │         Update stored tokens
  │         ↓
  │         Continue with request
  │
  └─ No → Use accessToken as-is

[If refresh fails]
        ↓
Alert user: "Session expired"
        ↓
Clear tokens
        ↓
Return to login/connect screen
```

## Error Handling

```
User Action
        ↓
Try API Call
        ↓
├─ No URL configured
│   └─ Alert: "Configuration Required"
│   └─ Auto-switch to URL edit mode
│
├─ Invalid URL format
│   └─ Alert: "Invalid URL format..."
│   └─ Stay in edit mode
│
├─ Network error
│   └─ Alert: "Failed to initiate connection"
│   └─ Suggest retry
│
├─ Server error (400, 401, 500, etc.)
│   └─ Alert: "Failed to initiate connection"
│   └─ Show response message
│
└─ Success
    └─ Proceed with connection
```

## State Management

```typescript
// URL Configuration
const [cetecUrl, setCetecUrl] = useState('');      // Stored URL
const [isEditingUrl, setIsEditingUrl] = useState(false); // Edit mode
const [tempUrl, setTempUrl] = useState('');        // Input buffer

// Connection State
const [isConnected, setIsConnected] = useState(false);     // Connection status
const [authSession, setAuthSession] = useState(null);      // Active OAuth session
const [connectedUser, setConnectedUser] = useState(null);  // User display name

// OAuth Flow State
const [manualCode, setManualCode] = useState('');      // Code input
const [activeTab, setActiveTab] = useState('shortcode'); // OAuth method tab
const [isLoading, setIsLoading] = useState(false);       // Loading indicator
```

## Security Checklist

- ✅ Access tokens never logged
- ✅ Refresh tokens stored in encrypted keychain (mobile)
- ✅ URL stored as plaintext (not sensitive)
- ✅ Tokens cleared on logout
- ✅ URL validation before storage
- ✅ Error messages don't leak sensitive info
- ⚠️ Web: Must upgrade to httpOnly cookies in production
- ⚠️ HTTPS: All API calls should be HTTPS only

## Testing Scenarios

1. **Fresh Install**
   - ✓ URL not configured
   - ✓ Can't connect without URL
   - ✓ Can configure URL
   - ✓ URL persists on restart

2. **Option 1: Short Code**
   - ✓ Show code in multiple formats
   - ✓ Copy code button works
   - ✓ Code expires after time limit
   - ✓ User enters code in CetecERP

3. **Option 2: Browser OAuth**
   - ✓ Opens browser with auth URL
   - ✓ Deep link redirects back to app
   - ✓ Code auto-populates manual field
   - ✓ Auto-switches to Settings tab

4. **Option 3: Manual Entry**
   - ✓ Can paste from clipboard
   - ✓ Validates code format
   - ✓ Exchanges code for tokens
   - ✓ Stores tokens securely

5. **Token Management**
   - ✓ Tokens load on app start
   - ✓ Tokens refresh before expiry
   - ✓ Tokens cleared on logout
   - ✓ Expired tokens trigger re-auth
