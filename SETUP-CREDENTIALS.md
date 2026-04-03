# Setting Up Credentials for Full Automation

## Why This Change?

Chrome's built-in password autofill **does not work reliably** with multi-page Okta logins. To achieve **full automation without any manual clicks**, the extension now stores your credentials directly.

## How to Set Up

### Step 1: Open Extension Settings

1. Click the **Okta Auto-Login** extension icon in your Chrome toolbar
2. The settings popup will appear

### Step 2: Enter Your Credentials

1. **Okta Username**: Enter your full email address (e.g., `barret@posit.co`)
2. **Okta Password**: Enter your Okta password
3. **Enable Auto-Login**: Make sure the toggle is **ON** (green)

### Step 3: Test the Login Flow

1. Navigate to your Okta SAML URL
2. The extension will automatically:
   - Fill username → Submit
   - Fill password → Submit
   - Trigger push notification
3. You approve the push on your device
4. Login completes

## Security

### Where Are Credentials Stored?

Your credentials are stored in **Chrome's local extension storage** (`chrome.storage.local`).

- ✅ **Local only**: Never sent to any external servers
- ✅ **Extension-scoped**: Only accessible by this extension
- ✅ **Sandboxed**: Protected by Chrome's extension security model
- ✅ **Only used on Okta**: The extension only runs on Okta domains

### Is This Secure?

**Yes, with caveats:**

1. **More secure than:** Plain text files, browser cookies, or localStorage
2. **Less secure than:** OS-level keychains (macOS Keychain, Windows Credential Manager)
3. **As secure as:** Chrome's extension storage (used by many password manager extensions)

### Security Best Practices

1. **Use a unique password** for Okta (don't reuse across sites)
2. **Enable 2FA/MFA** (which you already have with push notifications)
3. **Lock your computer** when away from desk
4. **Don't share your device** with untrusted users

### Can Others Access My Credentials?

**No**, unless they have:
1. Physical access to your unlocked computer
2. Ability to open Chrome DevTools and inspect extension storage
3. Malicious extensions installed with broad permissions

Chrome's extension storage is **not accessible** to:
- ❌ Other websites
- ❌ Other extensions (without special permissions)
- ❌ Network requests
- ❌ JavaScript on web pages

## Comparison: Chrome Password Manager vs. Extension Storage

| Feature | Chrome Password Manager | Extension Storage |
|---------|------------------------|-------------------|
| Autofill reliability on multi-page logins | ❌ Poor | ✅ Excellent |
| Security | ✅ Encrypted, cloud sync | ✅ Local only |
| Setup complexity | ✅ Simple (save on login) | ⚠️ Manual setup |
| Full automation | ❌ No (requires clicks) | ✅ Yes |
| Cross-device sync | ✅ Yes | ❌ No |

## Alternative: Use Chrome Password Manager (Less Automation)

If you prefer **not** to store credentials in the extension:

1. Leave username and password fields **blank** in the extension settings
2. Save your credentials in Chrome's password manager
3. The extension will attempt to use Chrome's autofill
4. **You may need to click the password field** to trigger autofill manually

This approach is more secure but requires one manual click per login.

## Removing Your Credentials

To remove your stored credentials:

1. Click the extension icon
2. Clear the username and password fields
3. Click outside the fields to save

Or:

1. Go to `chrome://extensions/`
2. Find "Okta Auto-Login"
3. Click "Remove" to uninstall completely

## Questions?

### Q: Can I see my stored credentials?

**A:** Yes, but only through Chrome DevTools:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Inspect views: service worker" for Okta Auto-Login
4. In console: `chrome.storage.local.get(['username', 'password'], console.log)`

### Q: Can I export/backup my credentials?

**A:** The extension doesn't have export functionality. Your credentials are only stored locally and won't sync to other devices.

### Q: What if I change my password?

**A:** Simply update the password in the extension popup settings.

### Q: Is encryption used?

**A:** Currently, credentials are stored in plain text in Chrome's extension storage. This is protected by Chrome's sandbox, but not encrypted at rest. A future version could add encryption with a master password.

## Upgrade Path (Future Enhancement)

If you need better security, we could add:
1. **Master password**: Encrypt credentials with a password you enter once per session
2. **OS keychain integration**: Store credentials in macOS Keychain or Windows Credential Manager
3. **Biometric unlock**: Use fingerprint/Face ID to access credentials

Let me know if you'd like any of these features!
