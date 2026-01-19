# Settings Screen - CetecERP URL Configuration Implementation

## What Was Added

### 1. **New Utility: `src/utils/cetecConfig.ts`**
Functions to save/retrieve CetecERP instance URL:
- `saveCetecUrl(url)` - Saves URL with validation
- `getCetecUrl()` - Retrieves saved URL
- `clearCetecUrl()` - Clears on logout
- `isCetecUrlConfigured()` - Checks if configured

**Storage:** AsyncStorage with key `cetec_instance_url`

### 2. **Updated OAuth API: `src/utils/oauthApi.ts`**
- Added dynamic URL resolution via `getApiBaseUrl()`
- All API calls now use the configured URL instead of hardcoded value
- Throws helpful error if URL not configured

### 3. **Enhanced Settings Screen**
New state variables:
```typescript
const [cetecUrl, setCetecUrl] = useState('');        // Current configured URL
const [isEditingUrl, setIsEditingUrl] = useState(false); // UI mode toggle
const [tempUrl, setTempUrl] = useState('');          // Input buffer
```

New handlers:
```typescript
handleSaveCetecUrl()    // Validates and saves URL
handleCancelUrlEdit()   // Reverts changes and closes editor
```

Updated OAuth handlers to check for URL configuration before proceeding:
```typescript
if (!cetecUrl) {
  Alert.alert('Configuration Required', 'Please configure your CetecERP URL first.');
  setIsEditingUrl(true);
  return;
}
```

### 4. **New UI Section: CetecERP Instance**
Added at the TOP of Settings page (before ERP Connection section)

**View Mode (URL configured):**
- Shows "Configured URL" label
- Displays the actual URL
- "Change URL" button

**View Mode (not configured):**
- Shows message "No CetecERP instance configured. Configure one to start connecting."
- "Configure URL" button

**Edit Mode:**
- Input field with placeholder
- Hint text: "Example: http://l418.cetecerpdevel.com:3030"
- "Save" button (primary color)
- "Cancel" button (secondary style)

## User Flow

### First Time Setup
1. User opens Settings
2. Sees "CetecERP Instance" section: "No CetecERP instance configured"
3. Taps "Configure URL"
4. Enters URL (e.g., `http://l418.cetecerpdevel.com:3030`)
5. Taps "Save"
6. URL is stored and displayed
7. Can now use all three OAuth connection methods

### Trying to Connect Without URL
1. User attempts "Get Code" without configuring URL
2. Alert appears: "Configuration Required"
3. Settings page auto-switches to edit mode
4. User enters URL and saves
5. Can retry connection

### Changing URL
1. User taps "Change URL"
2. Edit mode activates with current URL pre-filled
3. User modifies and taps "Save"
4. New URL is used for all future API calls

## URL Validation

The `saveCetecUrl()` function:
1. ✅ Trims whitespace
2. ✅ Rejects empty strings
3. ✅ Auto-prepends `http://` if no protocol
4. ✅ Validates URL format using `new URL()`
5. ✅ Stores only valid URLs
6. ✅ Throws descriptive error messages on failure

Example validations:
```
Input: "l418.cetecerpdevel.com:3030"
Stored: "http://l418.cetecerpdevel.com:3030"

Input: "http://localhost:3030"
Stored: "http://localhost:3030"

Input: "https://staging.cetecerp.com"
Stored: "https://staging.cetecerp.com"

Input: ""
Error: "URL cannot be empty"

Input: "not a real url"
Error: "Invalid URL format. Please enter a valid URL."
```

## Style Integration

New styles added to SettingsScreen's StyleSheet:
- `urlLabel` - For "Configured URL" label
- `urlValue` - For displaying the URL (monospace font)
- `inputLabel` - For "CetecERP Server URL" heading
- `inputHint` - For example text (italic)
- `urlInput` - For the text input field
- `buttonRow` - Flex container for Save/Cancel buttons
- `halfButton` - For side-by-side buttons

All styles respect light/dark mode via color scheme.

## API Integration

When any OAuth method is used:

```
User taps "Get Code"
  ↓
handleOption1_ServerGeneratedCode()
  ↓
Check: if (!cetecUrl)
  Yes → Show alert, switch to edit mode
  No → Continue
  ↓
oauthApi.initiateServerGeneratedCode()
  ↓
getApiBaseUrl()
  ↓
cetecConfig.getCetecUrl()
  ↓
POST {cetecUrl}/oauth/initiate
```

## Files Created/Modified

**Created:**
- `/src/utils/cetecConfig.ts` - URL storage utility
- `/.github/CETEC_URL_CONFIG.md` - Configuration guide

**Modified:**
- `/src/containers/SettingsScreen/SettingsScreen.tsx` - Added URL config UI + handlers
- `/src/utils/oauthApi.ts` - Added dynamic URL resolution

**No changes needed:**
- `App.tsx` - Works as-is
- `types/` - Types already defined
- `theme/` - Colors/spacing used as-is

## Testing Checklist

- [ ] Open Settings on fresh install → "No CetecERP instance configured"
- [ ] Tap "Configure URL" → Edit mode appears
- [ ] Enter valid URL → Save → Displays correctly
- [ ] Tap "Change URL" → Edit mode with pre-filled URL
- [ ] Try invalid URL → Error message appears
- [ ] Try empty URL → Error message appears
- [ ] URL persists after app restart
- [ ] Try "Get Code" without URL → Alert + auto-switch to edit
- [ ] Try "Get Code" with URL configured → Makes API call (if server available)
- [ ] URL displays with monospace font
- [ ] Light/dark mode colors work correctly

## Example Test URL

For local testing:
```
http://l418.cetecerpdevel.com:3030
```

This URL will be:
1. Validated ✓
2. Stored in AsyncStorage ✓
3. Used for all subsequent OAuth API calls ✓
4. Displayable to user ✓
