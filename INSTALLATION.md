# Quick Installation Guide

## Step 1: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Navigate to and select: `/Users/barret/tmp/okta-auto-login`
5. Extension loads successfully

## Step 2: Save Okta Credentials in Chrome

**IMPORTANT**: The extension relies on Chrome's password manager.

1. Navigate to your Okta login page
2. Manually enter username and password
3. When Chrome prompts "Save password?", click **Save**
4. This only needs to be done once

## Step 3: Enable Auto-Login

1. Click the extension icon in Chrome toolbar
2. Toggle **"Enable Auto-Login"** to ON
3. Badge should show "ON" in green

## Step 4: Test It

1. Navigate to your Okta login page
2. Watch as the extension automatically:
   - Fills username → submits
   - Fills password → submits
   - Clicks "Send Push"
3. Approve push notification on your device
4. Login completes

## Troubleshooting

### "Username/password not filled"
- Ensure credentials are saved in Chrome password manager
- Go to `chrome://settings/passwords` to verify

### "Extension badge shows OFF"
- Click extension icon
- Toggle "Enable Auto-Login" to ON

### "Push button not clicked"
- Check browser console (F12) for errors
- Look for `[Okta Auto-Login]` messages

## Next Steps

- Adjust delay if needed (Settings → Delay Between Actions)
- Monitor console logs for debugging
- See `readme.md` for full documentation
