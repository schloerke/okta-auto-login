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
  const settings = await chrome.storage.local.get(['enabled', 'delay']);
  if (settings.enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, delay: 500 });
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
