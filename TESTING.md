# Testing the Extension on SAML Redirect Pages

## What Changed

The extension now:
1. **Waits for forms to load dynamically** (up to 10 seconds)
2. **Watches for DOM changes** using MutationObserver
3. **Detects "Next" buttons** on username and password pages
4. **Better logging** to help debug issues

## How to Test

### Step 1: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "Okta Auto-Login"
3. Click the **reload icon** (circular arrow)

### Step 2: Open Your SAML Login Page

1. Navigate to your SAML redirect URL (the one you showed me):
   ```
   https://posit.okta.com/app/google/.../sso/saml?SAMLRequest=...
   ```

2. Open the **browser console** (F12 or Cmd+Option+J)
3. Go to the **Console** tab

### Step 3: Watch the Console

You should see messages like:

```
[Okta Auto-Login] Script initialized
[Okta Auto-Login] Current URL: https://posit.okta.com/...
[Okta Auto-Login] No form detected yet, waiting for form to load...
[Okta Auto-Login] Form appeared! Detected page type: username
[Okta Auto-Login] Found username field using: input[name="username"]
[Okta Auto-Login] Found submit button using: button[type="submit"]
[Okta Auto-Login] Username autofilled, submitting...
```

### Step 4: Expected Flow

1. **SAML page loads** → Extension waits for form to appear
2. **Username form appears** → Extension detects it, waits for Chrome autofill
3. **Username autofilled** → Extension clicks "Next"
4. **Password form appears** → Extension detects it, waits for Chrome autofill
5. **Password autofilled** → Extension clicks "Next"
6. **MFA page appears** → Extension clicks "Send Push"
7. **You manually approve** push notification on your device

## Troubleshooting

### "No form detected yet, waiting for form to load..."

This is **normal**. The extension is waiting for the Okta login form to appear after the SAML redirect.

If it waits 10 seconds and nothing happens:
- The form might not be loading at all
- Check if you need to be logged out first
- Share the console output with me

### "Username field not autofilled by Chrome"

**Solution**: Make sure credentials are saved in Chrome:
1. Go to `chrome://settings/passwords`
2. Search for "posit.okta.com"
3. Verify your username and password are saved
4. If not saved, manually log in once and click "Save" when prompted

### "Could not find submit button"

Check the console for:
```
[Okta Auto-Login] No submit button found. Available buttons: [...]
```

This will show what buttons the extension found. Share this with me if the button isn't detected.

### Form appears but nothing happens

Check if:
1. Extension is enabled (badge should show "ON" in green)
2. Chrome autofill is working (try typing the first letter of your username)
3. Console shows any error messages

## Debug Information to Share

If it's not working, please share:

1. **Console output** - All `[Okta Auto-Login]` messages
2. **Screenshot** of the login page when it appears
3. **Any error messages** in red

This will help me understand what's happening and fix any issues.

## Expected Timeline

- **0-2 seconds**: SAML redirect, waiting for form
- **2-5 seconds**: Form appears, waiting for autofill
- **5-6 seconds**: Username submitted
- **6-8 seconds**: Password form appears, waiting for autofill
- **8-9 seconds**: Password submitted
- **9-10 seconds**: MFA page, push sent
- **10+ seconds**: Waiting for manual approval
