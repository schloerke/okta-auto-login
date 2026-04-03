# Fixing Chrome Autofill for Multi-Page Okta Login

## The Problem

You're seeing: `[Okta Auto-Login] Password field not autofilled by Chrome`

This happens because Chrome's autofill doesn't always work well with **multi-page login flows** where username and password are on separate pages.

## Solution 1: Ensure Credentials Are Saved Correctly

### Step 1: Check Chrome Password Manager

1. Go to `chrome://settings/passwords`
2. Search for "posit.okta.com"
3. Look for an entry with:
   - **Website**: `https://posit.okta.com`
   - **Username**: Your email (e.g., `barret@posit.co`)
   - **Password**: Your password

### Step 2: If No Entry Exists or Entry Is Wrong

**Option A: Save During Manual Login**
1. **Disable the extension temporarily**:
   - Go to `chrome://extensions/`
   - Toggle "Okta Auto-Login" OFF
2. **Log in manually**:
   - Navigate to your Okta login page
   - Enter username → Click "Next"
   - Enter password → Click "Verify"
3. **Save when prompted**:
   - Chrome should ask "Save password?"
   - Click **"Save"**
4. **Re-enable the extension**
5. Try the auto-login again

**Option B: Add Password Manually**
1. Go to `chrome://settings/passwords`
2. Click "Add" (next to "Saved passwords")
3. Enter:
   - **Site**: `https://posit.okta.com`
   - **Username**: `barret@posit.co` (your email)
   - **Password**: Your Okta password
4. Click "Save"

## Solution 2: Update Extension Settings

### Increase Autofill Wait Time

1. Click the extension icon
2. Change "Delay Between Actions" from 500ms to **1500ms**
3. This gives Chrome more time to autofill

## Solution 3: Trigger Autofill Manually (Updated Extension)

I've updated the extension to:
1. **Focus the password field** automatically
2. **Click the field** to trigger Chrome's autofill dropdown
3. **Retry** if autofill doesn't work the first time
4. **Wait longer** (8 seconds total) for autofill to complete

### Test the Updated Version

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Find "Okta Auto-Login"
   - Click the **refresh icon** (circular arrow)

2. **Try logging in again**

3. **Watch the console** for:
   ```
   [Okta Auto-Login] Giving Chrome time to prepare autofill...
   [Okta Auto-Login] Waiting for Chrome autofill...
   [Okta Auto-Login] Attempting to trigger autofill by clicking...
   [Okta Auto-Login] Field filled!
   [Okta Auto-Login] Password autofilled, submitting...
   ```

## Solution 4: Manual Workaround

If autofill still doesn't work:

1. Let the extension handle the username page automatically
2. When it reaches the password page:
   - The extension will show a warning notification
   - **Click the password field** manually
   - Chrome's autofill dropdown will appear
   - **Select your password**
   - The extension will then submit automatically

## Why This Happens

Chrome's password manager was designed for **single-page login forms** where username and password are on the same page. Multi-page flows require Chrome to:
1. Remember that it autofilled the username
2. Associate the password page with the same site
3. Automatically trigger autofill on the second page

This doesn't always work reliably, especially if:
- The password was saved from a different domain
- The pages have different URLs
- Chrome's autofill heuristics don't recognize the flow

## Debugging

If it's still not working, check the console for:

1. **Field detection**:
   ```
   [Okta Auto-Login] Found password field using: input[name="credentials.passcode"]
   ```
   ✅ Good - field was found

2. **Autofill attempt**:
   ```
   [Okta Auto-Login] Waiting for Chrome autofill...
   [Okta Auto-Login] Attempting to trigger autofill by clicking...
   ```
   ✅ Good - trying to trigger autofill

3. **Final result**:
   - ✅ `[Okta Auto-Login] Field filled!` - Success!
   - ❌ `[Okta Auto-Login] Still not autofilled` - Chrome won't autofill

If you see "Still not autofilled", the issue is with Chrome's password manager, not the extension.

## Alternative: Use a Password Manager Extension

If Chrome's built-in autofill continues to be problematic, consider using:
- **1Password**
- **LastPass**
- **Bitwarden**

These password managers have better support for multi-page login flows and can fill the password field programmatically.
