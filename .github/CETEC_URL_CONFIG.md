# CetecERP URL Configuration Guide

## Overview

The Settings page now requires users to configure their CetecERP instance URL before attempting to connect. This allows the app to work with any CetecERP instance (development, staging, production).

## How It Works

### 1. First Time Setup
When user opens Settings for the first time:
- They see "CetecERP Instance" section at the top
- Status shows "No CetecERP instance configured"
- Button says "Configure URL"

### 2. Entering the URL
User taps "Configure URL" and:
- URL input field appears with hint: "Example: http://l418.cetecerpdevel.com:3030"
- User enters their CetecERP instance URL
- Two buttons: "Save" and "Cancel"

### 3. URL Validation
The app:
- Trims whitespace
- Validates URL format (must be valid URL)
- Auto-prepends `http://` if no protocol specified
- Stores securely in AsyncStorage

### 4. After Configuration
- Shows the configured URL in display mode
- Button changes to "Change URL" if user wants to update it
- All three OAuth methods now work with the configured URL

## Example URLs

```
Development (Local):
http://localhost:3030

Development (Network):
http://l418.cetecerpdevel.com:3030

Staging:
https://staging.cetecerp.com

Production:
https://api.cetecerp.com
```

## Storage

- URL stored in AsyncStorage with key: `cetec_instance_url`
- Persists across app sessions
- Can be changed anytime from Settings
- No encryption needed (non-sensitive config data)

## API Integration

All OAuth API calls now:
1. Retrieve the stored URL
2. Build API endpoints using that URL
3. Throw error if no URL is configured

Example flow:
```
User taps "Get Code"
  → Check: Is URL configured?
    → No: Show alert "Please configure URL first"
    → Yes: Call server API at configured URL
         POST {configuredUrl}/oauth/initiate
```

## Error Handling

If user tries to connect without URL configured:
- Alert shows: "Configuration Required: Please configure your CetecERP URL first."
- Settings page auto-switches to URL configuration mode
- User can enter URL and try again

## Security Considerations

- URL is stored as plain text in AsyncStorage (it's not sensitive)
- Consider adding SSL/TLS enforcement in production
- Could add URL validation to check server is reachable
- Could cache server metadata (name, logo) for UI display

## Future Enhancements

1. **Server List**: Let users select from a list of known servers
2. **Server Discovery**: Auto-detect available servers on network
3. **Server Info**: Fetch and display server name/version/logo
4. **Multiple Accounts**: Support connecting to multiple CetecERP instances
5. **URL Validation**: Ping server to verify URL is valid before saving
6. **Custom Fields**: Store additional server metadata (API version, etc.)
