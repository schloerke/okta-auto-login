// GitHub SSO Auto-Continue Content Script
// Detects the GitHub business SSO panel and auto-clicks "Continue"

(async function () {
  'use strict';

  // Only run in top-level frame
  if (window !== window.top) {
    return;
  }

  const settings = await chrome.storage.local.get(['enabled', 'githubSsoEnabled', 'githubSsoDelay']);

  if (settings.enabled === false) {
    return;
  }

  if (settings.githubSsoEnabled === false) {
    return;
  }

  const DELAY = settings.githubSsoDelay ?? 500;

  let handled = false;

  // Kick off detection
  checkForSsoPanel();

  const observer = new MutationObserver(() => {
    if (!handled) {
      checkForSsoPanel();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  async function checkForSsoPanel() {
    const panel = document.querySelector('div.business-sso-panel');
    if (!panel) return;
    if (!panel.textContent.includes('Authenticate your account')) return;
    if (handled) return;

    handled = true;
    observer.disconnect();

    await sleep(DELAY);

    const button = findContinueButton();
    if (!button) {
      console.log('[GitHub SSO] Continue button not found');
      return;
    }

    showNotification('GitHub SSO: clicking Continue...');
    button.click();
    console.log('[GitHub SSO] Clicked Continue button');
  }

  function findContinueButton() {
    const candidates = Array.from(document.querySelectorAll('button, a'));
    return candidates.find(el =>
      el.textContent.trim() === 'Continue' && isVisible(el)
    ) || null;
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function showNotification(message) {
    const existing = document.getElementById('okta-autologin-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'okta-autologin-notification';
    notification.textContent = message;

    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      backgroundColor: '#2196F3',
      color: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: '10000',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '300px'
    });

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
  }
})();
