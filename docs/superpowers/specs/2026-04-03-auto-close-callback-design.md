# Design: Auto-Close AWS OAuth Callback Window

**Date:** 2026-04-03
**Status:** Approved

## Overview

After the Okta login flow completes, the AWS CLI redirects the browser to a localhost callback page (`http://127.0.0.1:{port}/oauth/callback`) that displays "Request approved" and "You can close this window." Currently the user must close this tab manually. This feature auto-closes it after a configurable delay.

## Architecture

The feature lives entirely in the **background service worker** (`background.js`). No new content scripts are added. Detection uses two signals — URL shape and page text — before closing the tab.

## Components

### 1. Manifest (`manifest.json`)

Two additions:
- `"tabs"` added to `permissions` — required for `chrome.tabs.onUpdated` and `chrome.tabs.remove()`
- `"http://127.0.0.1/*"` added to `host_permissions` — required for `chrome.scripting.executeScript` on localhost pages

### 2. Background service worker (`background.js`)

New `chrome.tabs.onUpdated` listener fires whenever a tab finishes loading (`status === "complete"`).

**Detection logic (all must pass):**
1. `autoClose` setting is `true` (from `chrome.storage.local`)
2. Tab URL host is `127.0.0.1`, path is `/oauth/callback`, query string contains both `code=` and `state=`
3. `chrome.scripting.executeScript` is injected into the tab; returns `true` if `document.body.innerText` contains `"Request approved"` OR `"You can close this window"` (case-insensitive)

**Close logic:**
- If all checks pass, call `setTimeout(() => chrome.tabs.remove(tabId), autoCloseDelay)`
- `autoCloseDelay` is read from `chrome.storage.local` (default: `500`)

### 3. Popup UI (`popup.html` / `popup.js`)

Two new controls added to the existing settings panel, below the current delay setting:

| Control | Type | Default | Storage key |
|---|---|---|---|
| Auto-close AWS callback window | Toggle switch | `true` | `autoClose` |
| Close delay | `<select>` dropdown | `500` | `autoCloseDelay` |

Dropdown options:
- Immediately (value: `0`)
- 500ms (value: `500`) — default
- 1s (value: `1000`)
- 3s (value: `3000`)

Both settings are initialized in `chrome.runtime.onInstalled` alongside existing defaults and read/saved using the same pattern as `enabled` and `delay`.

## Data Flow

```
AWS CLI opens tab → tab navigates to 127.0.0.1/oauth/callback
  → chrome.tabs.onUpdated fires (status: "complete")
    → check autoClose setting
    → check URL (host + path + query params)
    → inject script → check page text
      → all pass: setTimeout(chrome.tabs.remove, autoCloseDelay)
```

## Error Handling

- If `chrome.scripting.executeScript` fails (e.g., tab already closed), the error is caught and logged; no crash.
- If the tab is closed by the user before the delay elapses, `chrome.tabs.remove` will throw a "No tab with id" error — caught and ignored.

## Testing

1. Run `aws sso login` to trigger the full flow
2. Verify the callback tab closes after ~500ms (default)
3. Toggle "Auto-close" OFF → verify tab stays open
4. Change delay to 3s → verify tab stays open for ~3s then closes
5. Manually close the tab during the delay window → verify no errors in background console
