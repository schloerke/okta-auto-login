# Visual Testing Guide

## The Issue

When the extension submits the username form and navigates to the password page, **Chrome clears the console by default**. This makes it look like the extension stopped working, but it's actually running on the new page.

## Solution 1: Enable "Preserve log" in Console

### Steps:
1. Open Chrome DevTools (F12 or Cmd+Option+J)
2. Click the **Console** tab
3. Look for the **⚙️ gear icon** (Settings) in the top-right of the console
   - OR right-click anywhere in the console
4. Check **"Preserve log"**
5. Reload the page and try again

Now you'll see logs from ALL pages in the flow:
```
[Okta Auto-Login] Script initialized (SAML page)
[Okta Auto-Login] Username autofilled, submitting...
[Okta Auto-Login] Script initialized (password page)  ← You'll see this now!
[Okta Auto-Login] Password autofilled, submitting...
[Okta Auto-Login] Script initialized (MFA page)       ← And this!
[Okta Auto-Login] Push notification sent!
```

## Solution 2: Watch Visual Notifications

I've updated the extension to show **blue notification popups** in the top-right of the page:

### What You'll See:

1. **SAML redirect page** → Blue notification: "Auto-filling username..."
2. **Username submitted** → Blue notification: "Submitting username..."
3. **Password page loads** → Blue notification: "Auto-filling password..."
4. **Password submitted** → Blue notification: "Submitting password..."
5. **MFA page loads** → Blue notification: "Triggering push notification..."

These notifications appear for 4 seconds, so you can see the extension working even if you don't have the console open.

## Testing the Updated Extension

### Step 1: Reload Extension
1. Go to `chrome://extensions/`
2. Find "Okta Auto-Login"
3. Click the **refresh icon** (circular arrow)

### Step 2: Enable Preserve Log
1. Open console (F12)
2. Enable "Preserve log" (see above)

### Step 3: Test Login Flow
1. Navigate to your SAML URL
2. **Watch for**:
   - Blue notification popups (top-right of page)
   - Console logs (if "Preserve log" is enabled)

### Step 4: Expected Flow

#### On SAML Page:
- Console: `[Okta Auto-Login] Script initialized`
- Console: `[Okta Auto-Login] No form detected yet, waiting for form to load...`

#### When Username Form Appears:
- Notification: **"Auto-filling username..."** (blue popup)
- Console: `[Okta Auto-Login] Form appeared! Detected page type: username`
- Console: `[Okta Auto-Login] Found username field using: input[name="identifier"]`
- Console: `[Okta Auto-Login] Field already filled: bar***`
- Notification: **"Submitting username..."** (blue popup)
- Console: `[Okta Auto-Login] Username submitted! Waiting for password page...`

#### When Password Page Loads:
- Console: `[Okta Auto-Login] Script initialized` (NEW - only visible with "Preserve log")
- Notification: **"Auto-filling password..."** (blue popup)
- Console: `[Okta Auto-Login] Form appeared! Detected page type: password`
- Console: `[Okta Auto-Login] Found password field using: input[name="credentials.passcode"]`

**If autofill works:**
- Console: `[Okta Auto-Login] Field filled!`
- Notification: **"Submitting password..."** (blue popup)
- Console: `[Okta Auto-Login] Password submitted! Waiting for MFA page...`

**If autofill doesn't work:**
- Notification: **"Click the password field to trigger autofill, or enter password manually"** (orange popup)
- You need to click the password field or enter password manually

#### When MFA Page Loads:
- Console: `[Okta Auto-Login] Script initialized` (NEW - only visible with "Preserve log")
- Notification: **"Triggering push notification..."** (blue popup)
- Console: `[Okta Auto-Login] Found push button using: div[data-se="okta_verify-push"] a.select-factor`
- Notification: **"Push notification sent! Please approve on your device"** (blue popup)

## Troubleshooting

### "I don't see console logs after username submits"
→ Enable "Preserve log" in console settings

### "I don't see notifications"
→ Reload the extension and make sure it's enabled

### "Password field isn't filling"
→ See `CHROME-AUTOFILL-FIX.md` for detailed troubleshooting

### "Extension stopped working"
→ Check the extension badge - it should show "ON" in green
→ Click the extension icon and verify "Enable Auto-Login" is toggled ON

## Why This Happens

Chrome's console clears on navigation by default to prevent cluttering. This is a browser feature, not a bug. The extension continues to work perfectly - you just can't see the logs without "Preserve log" enabled.

The new visual notifications solve this by showing you what's happening in real-time, even with console closed.
