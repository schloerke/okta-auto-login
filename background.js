// Background Service Worker for Okta Auto-Login
// Handles coordination between popup and content scripts

console.log('[Okta Auto-Login] Background service worker initialized');

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Okta Auto-Login] Received message:', message);

  switch (message.action) {
    case 'settingsChanged':
      handleSettingsChanged(message);
      break;

    case 'getStatus':
      getExtensionStatus().then(sendResponse);
      return true; // Keep channel open for async response

    case 'getMasterPassword':
      getMasterPassword().then(sendResponse);
      return true; // Keep channel open for async response

    case 'setMasterPassword':
      setMasterPassword(message.masterPassword).then(sendResponse);
      return true; // Keep channel open for async response

    default:
      console.log('[Okta Auto-Login] Unknown action:', message.action);
  }
});

/**
 * Handle settings changes from popup
 */
async function handleSettingsChanged(message) {
  console.log('[Okta Auto-Login] Settings changed:', message);

  // Update badge to show status
  if (message.enabled) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999' });
  }
}

/**
 * Get current extension status
 */
async function getExtensionStatus() {
  const settings = await chrome.storage.local.get(['enabled', 'delay']);
  return {
    enabled: settings.enabled !== false,
    delay: settings.delay || 500
  };
}

/**
 * Get master password from session storage
 */
async function getMasterPassword() {
  try {
    const sessionData = await chrome.storage.session.get(['masterPassword']);
    return {
      masterPassword: sessionData.masterPassword || null
    };
  } catch (error) {
    console.error('[Okta Auto-Login] Error accessing session storage in background:', error);
    return { masterPassword: null };
  }
}

/**
 * Set master password in session storage
 */
async function setMasterPassword(masterPassword) {
  try {
    await chrome.storage.session.set({ masterPassword });
    console.log('[Okta Auto-Login] Master password stored in session');
    return { success: true };
  } catch (error) {
    console.error('[Okta Auto-Login] Error storing master password:', error);
    return { success: false, error: error.message };
  }
}

// Set initial badge when extension loads
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

// Update badge when service worker starts
chrome.storage.local.get(['enabled']).then((settings) => {
  if (settings.enabled !== false) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999' });
  }
});

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

  const raw = settings.autoCloseDelay ?? 500;
  const delay = [0, 500, 1000, 3000].includes(raw) ? raw : 500;

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
