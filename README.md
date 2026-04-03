# Okta Auto-Login Chrome Extension

A Chrome extension that automates the Okta SAML login flow by auto-filling credentials and triggering push notifications.

## Features

- ✅ Automatically fills username on the first Okta login page
- ✅ Automatically fills password on the second page
- ✅ Automatically triggers push notifications to Okta Verify
- ✅ Uses Chrome's native password manager (no credentials stored in extension)
- ✅ Configurable delays between actions
- ✅ Easy enable/disable toggle
- ✅ Visual notifications during automation

## How It Works

1. Extension detects Okta login pages automatically
2. Waits for Chrome's password manager to autofill credentials
3. Automatically submits username and password forms
4. Triggers the "Send Push" button for MFA
5. You manually approve the push notification on your device
6. Login completes automatically

## Installation

### Prerequisites

- Google Chrome browser
- Okta credentials saved in Chrome's password manager

### Steps

1. **Clone or download this repository**
   ```bash
   cd /path/to/okta-auto-login
   ```

2. **Create icon images** (if needed)

   The extension requires three icon sizes. Convert the SVG template:
   ```bash
   # If you have ImageMagick installed:
   cd icons
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

   Or use an online converter like [CloudConvert](https://cloudconvert.com/svg-to-png) to create:
   - `icons/icon16.png` (16x16 pixels)
   - `icons/icon48.png` (48x48 pixels)
   - `icons/icon128.png` (128x128 pixels)

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `/Users/barret/tmp/okta-auto-login` directory
   - The extension should now appear in your extensions list

4. **Configure the extension**
   - Click the extension icon in your toolbar
   - Make sure "Enable Auto-Login" is toggled ON
   - Adjust delay if needed (default 500ms works for most cases)

5. **Save your Okta credentials in Chrome**
   - Navigate to your Okta login page manually
   - Enter your username and password
   - When Chrome prompts to save the password, click "Save"
   - This is required for the extension to work

## Usage

1. **Enable the extension** via the popup (click the extension icon)
2. **Navigate to your Okta login page**
3. The extension will automatically:
   - Fill your username and submit
   - Fill your password and submit
   - Click "Send Push" for MFA
4. **Approve the push notification** on your device manually
5. Login completes automatically

## Configuration

### Settings (via popup)

- **Enable Auto-Login**: Toggle to enable/disable automation
- **Delay Between Actions**: Wait time in milliseconds between form submissions (default: 500ms)

### Supported Okta Domains

The extension works on:
- `*.okta.com`
- `*.oktapreview.com`
- `*.okta-emea.com`

## Security

- **No credentials are stored in the extension** - relies entirely on Chrome's password manager
- All credential handling is done by Chrome's native autofill
- Extension only triggers form submissions and button clicks
- Works only on official Okta domains (cannot be abused on phishing sites)

## Troubleshooting

### Extension doesn't auto-fill credentials

**Solution**: Make sure your Okta credentials are saved in Chrome's password manager.

1. Go to `chrome://settings/passwords`
2. Search for your Okta domain
3. Verify credentials are saved
4. If not, manually log in once and save when prompted

### Forms don't submit automatically

**Possible causes**:
- Chrome autofill hasn't filled the fields yet (extension waits up to 5 seconds)
- Okta page structure has changed
- Increase the delay setting in the extension popup

**Solution**: Check the browser console (F12) for error messages starting with `[Okta Auto-Login]`

### Push notification doesn't trigger

**Solution**: The extension looks for common button selectors. If Okta's UI has changed:
1. Open the browser console (F12)
2. Look for error messages
3. You may need to update the selectors in `content.js`

### Extension badge shows "OFF"

**Solution**: Click the extension icon and toggle "Enable Auto-Login" to ON.

## Development

### File Structure

```
okta-auto-login/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html          # Settings UI
├── popup.css           # UI styling
├── popup.js            # Settings logic
├── content.js          # Main automation script
├── background.js       # Service worker
├── icons/              # Extension icons
│   ├── icon.svg        # SVG template
│   ├── icon16.png      # 16x16 icon
│   ├── icon48.png      # 48x48 icon
│   └── icon128.png     # 128x128 icon
└── readme.md           # This file
```

### Key Components

- **content.js**: Detects page type, waits for autofill, and submits forms
- **popup.js**: Handles settings UI and saves configuration
- **background.js**: Coordinates between popup and content scripts, manages badge

### Debugging

1. Open Chrome DevTools (F12) on any Okta page
2. Check the Console tab for messages starting with `[Okta Auto-Login]`
3. All automation steps are logged

### Customization

To modify delays or selectors:

1. Edit `content.js` and adjust:
   - `DELAY`: Default delay between actions
   - `MAX_WAIT_FOR_AUTOFILL`: Max wait time for Chrome autofill
   - Selectors in `findSubmitButton()` and `findPushButton()`

2. Reload the extension in `chrome://extensions/`

## Limitations

- Requires Chrome's password manager to have saved credentials
- Only works on Okta pages (by design, for security)
- Cannot automatically approve push notifications (requires manual action)
- May break if Okta significantly changes their UI

## Privacy

This extension:
- Does NOT store any passwords or credentials
- Does NOT send any data to external servers
- Does NOT track your usage
- Only runs on Okta domains
- Uses Chrome's native password autofill exclusively

## License

This is a personal automation tool. Use at your own risk.

## Version

Current version: 1.0.0

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review browser console logs (F12)
3. Verify Chrome password manager has your credentials saved
