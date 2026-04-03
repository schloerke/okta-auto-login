# Auto-Close AWS OAuth Callback Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically close the AWS SSO oauth callback tab (`http://127.0.0.1:{port}/oauth/callback`) after detecting "Request approved" on the page, with a configurable delay and a dedicated popup toggle.

**Architecture:** The background service worker listens for tab navigation events, checks URL shape and page content, then removes the tab after the configured delay. Two new settings (`autoClose`, `autoCloseDelay`) are added to `chrome.storage.local` and exposed in the popup UI alongside the existing settings.

**Tech Stack:** Chrome Extension Manifest V3, chrome.tabs API, chrome.scripting API, vanilla JS, HTML/CSS

---

## File Map

| File | Change |
|---|---|
| `manifest.json` | Add `"tabs"` permission; add `"http://127.0.0.1/*"` to host_permissions |
| `background.js` | Add `chrome.tabs.onUpdated` listener; initialize new defaults in `onInstalled` |
| `popup.html` | Add auto-close toggle and close-delay dropdown after the delay section |
| `popup.js` | Wire up new controls: load settings, save on change |

---

### Task 1: Update manifest permissions

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Add `tabs` to permissions array**

In `manifest.json`, the current permissions array is:
```json
"permissions": [
  "activeTab",
  "scripting",
  "storage"
],
```

Change it to:
```json
"permissions": [
  "activeTab",
  "scripting",
  "storage",
  "tabs"
],
```

- [ ] **Step 2: Add `http://127.0.0.1/*` to host_permissions**

Current:
```json
"host_permissions": [
  "*://*.okta.com/*",
  "*://*.oktapreview.com/*",
  "*://*.okta-emea.com/*"
],
```

Change to:
```json
"host_permissions": [
  "*://*.okta.com/*",
  "*://*.oktapreview.com/*",
  "*://*.okta-emea.com/*",
  "http://127.0.0.1/*"
],
```

- [ ] **Step 3: Verify the extension still loads**

1. Open `chrome://extensions/`
2. Click the reload button on the Okta Auto-Login extension
3. Verify no errors appear in the extension card
4. Click "Details" → verify permissions now include "Read and change your data on 127.0.0.1"

- [ ] **Step 4: Commit**

```bash
git add manifest.json
git commit -m "feat: add tabs permission and 127.0.0.1 host permission for callback auto-close"
```

---

### Task 2: Initialize new settings defaults in background.js

**Files:**
- Modify: `background.js`

- [ ] **Step 1: Add `autoClose` and `autoCloseDelay` to the `onInstalled` defaults block**

Current block in `background.js` (lines 89–101):
```js
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Okta Auto-Login] Extension installed');

  // Set default settings
  const settings = await chrome.storage.local.get(['enabled', 'delay']);
  if (settings.enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, delay: 500 });
  }

  // Set initial badge
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
});
```

Replace with:
```js
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Okta Auto-Login] Extension installed');

  // Set default settings
  const settings = await chrome.storage.local.get(['enabled', 'delay', 'autoClose', 'autoCloseDelay']);
  const defaults = {};
  if (settings.enabled === undefined) defaults.enabled = true;
  if (settings.delay === undefined) defaults.delay = 500;
  if (settings.autoClose === undefined) defaults.autoClose = true;
  if (settings.autoCloseDelay === undefined) defaults.autoCloseDelay = 500;
  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }

  // Set initial badge
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
});
```

- [ ] **Step 2: Verify defaults are written**

1. Open `chrome://extensions/` and reload the extension
2. Open the background service worker DevTools: on the extension card, click "service worker"
3. In the Console, run:
   ```js
   chrome.storage.local.get(['autoClose', 'autoCloseDelay'], console.log)
   ```
4. Expected output: `{autoClose: true, autoCloseDelay: 500}`

   > Note: `onInstalled` only fires when the extension is freshly installed or updated, not on every reload. If the keys are already set (from a previous install), this step won't overwrite them. To force a clean state during testing, run in the service worker console:
   > ```js
   > chrome.storage.local.remove(['autoClose', 'autoCloseDelay'])
   > ```
   > Then disable and re-enable the extension to trigger `onInstalled`.

- [ ] **Step 3: Commit**

```bash
git add background.js
git commit -m "feat: initialize autoClose and autoCloseDelay defaults in onInstalled"
```

---

### Task 3: Add auto-close listener to background.js

**Files:**
- Modify: `background.js`

- [ ] **Step 1: Add the `chrome.tabs.onUpdated` listener at the bottom of `background.js`**

Append this block after the existing `chrome.storage.local.get` call at the bottom of the file:

```js
// Auto-close AWS SSO oauth callback tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  // Check URL shape: host must be 127.0.0.1, path must be /oauth/callback,
  // query must contain both code= and state=
  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return;
  }
  if (url.hostname !== '127.0.0.1') return;
  if (url.pathname !== '/oauth/callback') return;
  if (!url.searchParams.has('code') || !url.searchParams.has('state')) return;

  // Check setting
  const settings = await chrome.storage.local.get(['autoClose', 'autoCloseDelay']);
  if (settings.autoClose === false) return;

  const delay = settings.autoCloseDelay ?? 500;

  // Verify page content contains approval text
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = document.body?.innerText ?? '';
        return text.toLowerCase().includes('request approved') ||
               text.toLowerCase().includes('you can close this window');
      }
    });
  } catch (err) {
    console.error('[Okta Auto-Login] Could not inspect callback page:', err);
    return;
  }

  if (!results?.[0]?.result) return;

  console.log(`[Okta Auto-Login] AWS callback confirmed. Closing tab in ${delay}ms...`);
  setTimeout(() => {
    chrome.tabs.remove(tabId).catch((err) => {
      console.log('[Okta Auto-Login] Tab already closed:', err.message);
    });
  }, delay);
});
```

- [ ] **Step 2: Reload the extension and verify the listener is registered**

1. Reload the extension on `chrome://extensions/`
2. Open the service worker DevTools (click "service worker" link on the extension card)
3. Verify no errors in the console

- [ ] **Step 3: Manually test the happy path**

1. Open a new tab and navigate to:
   `http://127.0.0.1:8080/oauth/callback?code=test123&state=abc456`
2. The page will show an error from your local port (no server running) — that's fine for URL detection testing
3. To test full page-content detection, you need a page that actually contains "Request approved". Run a minimal local server:
   ```bash
   python3 -c "
   import http.server, urllib.parse, socketserver

   class H(http.server.BaseHTTPRequestHandler):
     def do_GET(self):
       self.send_response(200)
       self.send_header('Content-type','text/html')
       self.end_headers()
       self.wfile.write(b'<html><body><h1>Request approved</h1><p>You can close this window</p></body></html>')
     def log_message(self, *a): pass

   with socketserver.TCPServer(('', 8080), H) as s: s.serve_forever()
   " &
   ```
4. In Chrome, navigate to `http://127.0.0.1:8080/oauth/callback?code=abc&state=xyz`
5. Expected: tab closes after ~500ms
6. Kill the test server: `kill %1`

- [ ] **Step 4: Test with autoClose disabled**

1. In the service worker console, run:
   ```js
   chrome.storage.local.set({ autoClose: false })
   ```
2. Repeat Step 3 — tab should NOT close
3. Re-enable: `chrome.storage.local.set({ autoClose: true })`

- [ ] **Step 5: Commit**

```bash
git add background.js
git commit -m "feat: auto-close AWS SSO oauth callback tab on Request approved"
```

---

### Task 4: Add controls to popup.html

**Files:**
- Modify: `popup.html`

- [ ] **Step 1: Add the auto-close toggle section after the delay section**

Find this block in `popup.html` (lines 67–73):
```html
    <div class="section">
      <label for="delay-input" class="setting-label">
        <span>Delay Between Actions (ms)</span>
        <p class="setting-description">Wait time between auto-fill actions (default: 500ms)</p>
      </label>
      <input type="number" id="delay-input" min="0" max="5000" step="100" value="500">
    </div>
```

Insert this block immediately after it (before `<div class="section status-section">`):
```html
    <div class="section">
      <div class="setting-row">
        <label for="auto-close-toggle" class="setting-label">
          <span>Auto-close AWS callback window</span>
          <p class="setting-description">Close the "Request approved" tab automatically after login</p>
        </label>
        <label class="toggle">
          <input type="checkbox" id="auto-close-toggle">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="section">
      <label for="auto-close-delay-select" class="setting-label">
        <span>Callback close delay</span>
        <p class="setting-description">How long to wait before closing the callback tab</p>
      </label>
      <select id="auto-close-delay-select">
        <option value="0">Immediately</option>
        <option value="500" selected>500ms</option>
        <option value="1000">1s</option>
        <option value="3000">3s</option>
      </select>
    </div>
```

- [ ] **Step 2: Verify the popup renders correctly**

1. Reload the extension on `chrome://extensions/`
2. Click the extension icon to open the popup
3. Unlock with your master password
4. Scroll down — verify you see:
   - "Auto-close AWS callback window" toggle (should appear ON by default visually once wired in Task 5)
   - "Callback close delay" dropdown showing "500ms" selected

- [ ] **Step 3: Commit**

```bash
git add popup.html
git commit -m "feat: add auto-close toggle and delay dropdown to popup UI"
```

---

### Task 5: Wire up new controls in popup.js

**Files:**
- Modify: `popup.js`

- [ ] **Step 1: Add element references at the top of the `DOMContentLoaded` handler**

Find the existing element references block (lines 10–16):
```js
  const enabledToggle = document.getElementById('enabled-toggle');
  const masterPasswordSetupInput = document.getElementById('master-password-setup-input');
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const delayInput = document.getElementById('delay-input');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
```

Add two lines after `delayInput`:
```js
  const enabledToggle = document.getElementById('enabled-toggle');
  const masterPasswordSetupInput = document.getElementById('master-password-setup-input');
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const delayInput = document.getElementById('delay-input');
  const autoCloseToggle = document.getElementById('auto-close-toggle');
  const autoCloseDelaySelect = document.getElementById('auto-close-delay-select');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
```

- [ ] **Step 2: Load the new settings in `showMainSettings()`**

Find this line in `showMainSettings()`:
```js
    const settings = await chrome.storage.local.get(['enabled', 'username', 'password', 'delay']);
```

Change it to:
```js
    const settings = await chrome.storage.local.get(['enabled', 'username', 'password', 'delay', 'autoClose', 'autoCloseDelay']);
```

Then find the block that sets initial values from settings:
```js
    enabledToggle.checked = settings.enabled !== false; // Default to true
    usernameInput.value = settings.username || '';
    delayInput.value = settings.delay || 500;
```

Add two lines after `delayInput.value`:
```js
    enabledToggle.checked = settings.enabled !== false; // Default to true
    usernameInput.value = settings.username || '';
    delayInput.value = settings.delay || 500;
    autoCloseToggle.checked = settings.autoClose !== false; // Default to true
    autoCloseDelaySelect.value = String(settings.autoCloseDelay ?? 500);
```

- [ ] **Step 3: Add save listeners for the two new controls**

Find the `delayInput` change listener (lines 193–196):
```js
  // Save delay setting
  delayInput.addEventListener('change', async (e) => {
    const delay = parseInt(e.target.value, 10);
    await chrome.storage.local.set({ delay });
  });
```

Add these two listeners immediately after it:
```js
  // Save auto-close toggle
  autoCloseToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoClose: e.target.checked });
  });

  // Save auto-close delay
  autoCloseDelaySelect.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoCloseDelay: parseInt(e.target.value, 10) });
  });
```

- [ ] **Step 4: Verify full round-trip in the popup**

1. Reload the extension
2. Open the popup and unlock
3. Toggle "Auto-close AWS callback window" OFF → reload popup → verify it's still OFF
4. Change delay to "1s" → reload popup → verify "1s" is selected
5. Toggle back ON → change delay back to "500ms" → verify both persist

- [ ] **Step 5: Verify the toggle controls background behavior**

1. With auto-close ON and delay at 500ms, start the test server from Task 3 Step 3
2. Navigate to `http://127.0.0.1:8080/oauth/callback?code=abc&state=xyz` — tab should close in ~500ms
3. Change popup delay to "3s" — navigate again — tab should close in ~3s
4. Toggle auto-close OFF — navigate again — tab should stay open
5. Kill test server: `kill %1`

- [ ] **Step 6: Commit**

```bash
git add popup.js
git commit -m "feat: wire up auto-close toggle and delay dropdown in popup settings"
```

---

### Task 6: Add select styling to popup.css

**Files:**
- Modify: `popup.css`

- [ ] **Step 1: Check if `<select>` elements are already styled**

Open `popup.css` and search for any `select` rules. If none exist, the dropdown will fall back to browser defaults which may look inconsistent with the existing `<input>` fields.

- [ ] **Step 2: Add select styling that matches the existing input style**

Read `popup.css` to find the `input[type="number"]` or general `input` rule. Add a matching rule for `select`:

```css
select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: white;
  color: #333;
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: #4CAF50;
}
```

- [ ] **Step 3: Verify visual consistency**

1. Reload the extension and open the popup
2. Verify the "Callback close delay" dropdown visually matches the "Delay Between Actions" number input in size and styling

- [ ] **Step 4: Commit**

```bash
git add popup.css
git commit -m "feat: style select dropdown to match existing input fields in popup"
```
