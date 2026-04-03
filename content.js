// Okta Auto-Login Content Script
// This script runs on all Okta pages and automates the login flow

(async function() {
  'use strict';

  // Only run in top-level frame (not iframes)
  if (window !== window.top) {
    return;
  }

  // Check if auto-login is enabled and get credentials
  const settings = await chrome.storage.local.get(['enabled', 'username', 'password', 'delay']);
  if (settings.enabled === false) {
    console.log('[Okta Auto-Login] Auto-login is disabled');
    return;
  }

  if (!settings.username || !settings.password) {
    console.log('[Okta Auto-Login] Credentials not configured. Please set them in the extension popup.');
    showNotification('Credentials not configured! Click extension icon to set up.', 'warning');
    return;
  }

  // Get master password from background (avoids storage restrictions on certain pages)
  let sessionData = await chrome.runtime.sendMessage({ action: 'getMasterPassword' });
  if (!sessionData || !sessionData.masterPassword) {
    console.log('[Okta Auto-Login] Session locked. Prompting for master password...');

    // Show modal to get master password
    const enteredPassword = await showMasterPasswordModal(settings.password);
    if (!enteredPassword) {
      console.log('[Okta Auto-Login] User cancelled password prompt');
      return;
    }

    // Store master password in session for this browser session
    await chrome.runtime.sendMessage({
      action: 'setMasterPassword',
      masterPassword: enteredPassword
    });

    sessionData = { masterPassword: enteredPassword };
    console.log('[Okta Auto-Login] Session unlocked via modal');
  }

  const DELAY = settings.delay || 500;
  const USERNAME = settings.username;
  const masterPassword = sessionData.masterPassword;

  // Decrypt password with master password
  let PASSWORD;
  try {
    PASSWORD = await window.cryptoUtils.decrypt(settings.password, masterPassword);
    console.log('[Okta Auto-Login] Using stored credentials (encrypted with master password)');
  } catch (error) {
    console.error('[Okta Auto-Login] Failed to decrypt password:', error);
    showNotification('Failed to decrypt password. Please unlock extension again.', 'warning');
    return;
  }

  console.log('[Okta Auto-Login] Script initialized');
  console.log('[Okta Auto-Login] Current URL:', window.location.href);
  console.log('[Okta Auto-Login] TIP: Enable "Preserve log" in console to see logs across page navigations');

  // Wait for the login form to appear (handles SAML redirects and dynamic loading)
  await waitForLoginForm();

  /**
   * Wait for login forms to appear and handle them continuously (SPA support)
   */
  async function waitForLoginForm() {
    // Track which page types we've already processed to avoid duplicates
    const processedPages = new Set();

    // Try immediate detection first
    let pageType = detectPageType();

    if (pageType) {
      console.log('[Okta Auto-Login] Detected page type immediately:', pageType);
      processedPages.add(pageType);
      if (pageType === 'username') {
        showNotification('Auto-filling username...', 'info');
      } else if (pageType === 'password') {
        showNotification('Auto-filling password...', 'info');
      } else if (pageType === 'mfa') {
        showNotification('Triggering FastPass...', 'info');
      }
      await handlePageType(pageType);
    } else {
      console.log('[Okta Auto-Login] No form detected yet, waiting for form to load...');
    }

    // Set up a CONTINUOUS MutationObserver to watch for forms appearing
    // This handles SPA navigation where forms change without page reload
    const observer = new MutationObserver(async () => {
      const pageType = detectPageType();

      // Only process if we found a form and haven't processed this type yet
      if (pageType && !processedPages.has(pageType)) {
        console.log('[Okta Auto-Login] New form detected! Type:', pageType);
        processedPages.add(pageType);

        if (pageType === 'username') {
          showNotification('Auto-filling username...', 'info');
        } else if (pageType === 'password') {
          showNotification('Auto-filling password...', 'info');
        } else if (pageType === 'mfa') {
          showNotification('Triggering FastPass...', 'info');
        }

        await handlePageType(pageType);
      }
    });

    // Start observing - this will keep running throughout the session
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Okta Auto-Login] Watching for form changes (SPA mode)...');

    // Don't disconnect - keep watching for the entire login flow!
  }

  /**
   * Handle the detected page type
   */
  async function handlePageType(pageType) {
    console.log('[Okta Auto-Login] Processing page type:', pageType);

    switch (pageType) {
      case 'username':
        await handleUsernamePage();
        break;
      case 'password':
        await handlePasswordPage();
        break;
      case 'mfa':
        await handleMFAPage();
        break;
      default:
        console.log('[Okta Auto-Login] Unknown page type');
    }

    console.log('[Okta Auto-Login] Finished processing', pageType, 'page');
  }

  /**
   * Detect what type of Okta page we're on
   */
  function detectPageType() {
    // Debug: Log all input fields found
    const allInputs = document.querySelectorAll('input');
    console.log('[Okta Auto-Login] Found inputs:', Array.from(allInputs).map(i => ({
      type: i.type,
      name: i.name,
      id: i.id,
      autocomplete: i.autocomplete,
      placeholder: i.placeholder
    })));

    // Check for username field (Okta uses name="identifier")
    const usernameSelectors = [
      'input[name="identifier"]',  // Okta Identity Engine uses "identifier"
      'input[name="username"]',
      'input[autocomplete="username"]',
      'input[type="text"][autocomplete="username"]',
      '#okta-signin-username'
    ];

    for (const selector of usernameSelectors) {
      const usernameField = document.querySelector(selector);
      if (usernameField && !document.querySelector('input[type="password"]')) {
        console.log('[Okta Auto-Login] Detected username field:', selector);
        return 'username';
      }
    }

    // Check for password field (Okta uses name="credentials.passcode")
    const passwordSelectors = [
      'input[name="credentials.passcode"]',  // Okta Identity Engine
      'input[type="password"]',
      'input[name="password"]',
      '#okta-signin-password'
    ];

    for (const selector of passwordSelectors) {
      const passwordField = document.querySelector(selector);
      if (passwordField) {
        console.log('[Okta Auto-Login] Detected password field:', selector);
        return 'password';
      }
    }

    // Check for MFA/Push notification page
    const pushButton = findPushButton();
    if (pushButton) {
      console.log('[Okta Auto-Login] Detected MFA page');
      return 'mfa';
    }

    // Debug: Log page content to help identify the page
    console.log('[Okta Auto-Login] Page URL:', window.location.href);
    console.log('[Okta Auto-Login] Page title:', document.title);
    console.log('[Okta Auto-Login] All buttons:', Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => b.textContent || b.value).filter(Boolean));

    return null;
  }

  /**
   * Handle username page
   */
  async function handleUsernamePage() {
    // Try multiple selectors for username field (Okta Identity Engine specific)
    const usernameSelectors = [
      'input[name="identifier"]',  // Okta Identity Engine primary selector
      'input[name="username"]',
      'input[autocomplete="username"]',
      '#okta-signin-username'
    ];

    let usernameField = null;
    for (const selector of usernameSelectors) {
      usernameField = document.querySelector(selector);
      if (usernameField) {
        console.log('[Okta Auto-Login] Found username field using:', selector);
        break;
      }
    }

    const submitButton = findSubmitButton();

    if (!usernameField) {
      console.log('[Okta Auto-Login] Could not find username field');
      console.log('[Okta Auto-Login] Available input fields:',
        Array.from(document.querySelectorAll('input')).map(i => `${i.type}/${i.name}/${i.id}`));
      return;
    }

    if (!submitButton) {
      console.log('[Okta Auto-Login] Could not find submit button');
      return;
    }

    // Fill username from stored credentials
    console.log('[Okta Auto-Login] Filling username:', USERNAME.substring(0, 3) + '***');
    usernameField.value = USERNAME;

    // Trigger events to simulate user input
    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
    usernameField.dispatchEvent(new Event('change', { bubbles: true }));

    console.log('[Okta Auto-Login] Username filled, submitting...');
    showNotification('Submitting username...', 'info');
    await sleep(DELAY);

    // Submit the form
    submitButton.click();
    console.log('[Okta Auto-Login] Username submitted! Waiting for password page...');
  }

  /**
   * Handle password page
   */
  async function handlePasswordPage() {
    // Try multiple selectors for password field (Okta Identity Engine specific)
    const passwordSelectors = [
      'input[name="credentials.passcode"]',  // Okta Identity Engine primary selector
      'input[type="password"]',
      'input[name="password"]',
      '#okta-signin-password'
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      passwordField = document.querySelector(selector);
      if (passwordField) {
        console.log('[Okta Auto-Login] Found password field using:', selector);
        break;
      }
    }

    const submitButton = findSubmitButton();

    if (!passwordField) {
      console.log('[Okta Auto-Login] Could not find password field');
      return;
    }

    if (!submitButton) {
      console.log('[Okta Auto-Login] Could not find submit button');
      return;
    }

    // Small delay before filling
    await sleep(300);

    // Fill password from stored credentials
    console.log('[Okta Auto-Login] Filling password: ***');
    passwordField.value = PASSWORD;

    // Trigger events to simulate user input
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));

    console.log('[Okta Auto-Login] Password filled, submitting...');
    showNotification('Submitting password...', 'info');
    await sleep(DELAY);

    // Submit the form
    submitButton.click();
    console.log('[Okta Auto-Login] Password submitted! Waiting for MFA page...');
  }

  /**
   * Handle MFA/FastPass page
   */
  async function handleMFAPage() {
    const pushButton = findPushButton();

    if (!pushButton) {
      console.log('[Okta Auto-Login] Could not find FastPass button');
      return;
    }

    console.log('[Okta Auto-Login] Found FastPass button, triggering...');
    await sleep(DELAY);

    pushButton.click();
    showNotification('FastPass authentication triggered!', 'info');
    console.log('[Okta Auto-Login] FastPass triggered, waiting for authentication...');
  }

  /**
   * Find the submit button on the page
   */
  function findSubmitButton() {
    // Okta Identity Engine uses: <input class="button button-primary" type="submit" value="Next" data-type="save">
    const selectors = [
      'input.button-primary[type="submit"]',  // Okta Identity Engine primary selector
      'input[data-type="save"]',              // Okta-specific
      'input[type="submit"]',
      'button.button-primary[type="submit"]',
      'button[type="submit"]',
      'button[data-type="save"]'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && isVisible(button)) {
        console.log('[Okta Auto-Login] Found submit button using:', selector, '- value:', button.value || button.textContent);
        return button;
      }
    }

    // Fallback: find by button text (Next, Verify, Sign In)
    const elements = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
    const found = elements.find(btn => {
      const text = (btn.textContent || btn.value || '').toLowerCase().trim();
      return isVisible(btn) && (
        text === 'next' ||
        text === 'verify' ||
        text === 'sign in' ||
        text === 'submit'
      );
    });

    if (found) {
      console.log('[Okta Auto-Login] Found submit button by text:', found.textContent || found.value);
    } else {
      console.log('[Okta Auto-Login] No submit button found. Available buttons:',
        elements.map(e => `${e.tagName}[${e.className}]="${e.value || e.textContent}"`).filter(Boolean));
    }

    return found;
  }

  /**
   * Find the FastPass button (Okta Verify)
   */
  function findPushButton() {
    // Okta Identity Engine MFA page structure:
    // <div data-se="okta_verify-signed_nonce"><a class="button select-factor link-button" ...>Select</a></div>
    const selectors = [
      'div[data-se="okta_verify-signed_nonce"] a.select-factor',  // FastPass primary
      'div[data-se="okta_verify-signed_nonce"] a',                // FastPass fallback
      'div[data-se="okta_verify-signed_nonce"] button',           // FastPass button variant
      'a[aria-label*="FastPass"]',                                // By aria-label
      'a[aria-label*="Okta Verify"]',                             // Generic Okta Verify
      'button[data-se="okta_verify-signed_nonce"]'                // Direct button selector
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && isVisible(button)) {
        console.log('[Okta Auto-Login] Found FastPass button using:', selector);
        return button;
      }
    }

    // Fallback: find by text content
    const elements = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
    const found = elements.find(el => {
      const text = (el.textContent || el.innerText || '').toLowerCase().trim();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      return isVisible(el) && (
        text.includes('fastpass') ||
        text.includes('use okta fastpass') ||
        ariaLabel.includes('fastpass') ||
        ariaLabel.includes('okta verify')
      );
    });

    if (found) {
      console.log('[Okta Auto-Login] Found FastPass button by text:', found.textContent || found.getAttribute('aria-label'));
    } else {
      console.log('[Okta Auto-Login] No FastPass button found. Available MFA elements:',
        elements.slice(0, 10).map(e => `${e.tagName}[${e.className}]="${e.textContent?.trim().substring(0, 30)}"`));
    }

    return found;
  }


  /**
   * Check if an element is visible
   */
  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Sleep utility
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show a modal to prompt for master password
   */
  async function showMasterPasswordModal(encryptedPassword) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.id = 'okta-autologin-modal-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '999999',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      });

      // Create modal content
      const modal = document.createElement('div');
      Object.assign(modal.style, {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '90%'
      });

      modal.innerHTML = `
        <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #1a1a1a;">🔒 Session Locked</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">Enter your master password to unlock auto-login</p>
        <input type="password" id="okta-autologin-password-input" placeholder="Master password" style="
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
          margin-bottom: 10px;
        ">
        <div id="okta-autologin-error" style="color: #d32f2f; font-size: 12px; margin-bottom: 10px; display: none;"></div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="okta-autologin-cancel" style="
            padding: 10px 20px;
            border: 1px solid #ddd;
            background: white;
            color: #666;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
          ">Cancel</button>
          <button id="okta-autologin-unlock" style="
            padding: 10px 20px;
            border: none;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          ">Unlock</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const input = modal.querySelector('#okta-autologin-password-input');
      const unlockBtn = modal.querySelector('#okta-autologin-unlock');
      const cancelBtn = modal.querySelector('#okta-autologin-cancel');
      const errorDiv = modal.querySelector('#okta-autologin-error');

      // Focus input
      setTimeout(() => input.focus(), 100);

      // Handle unlock
      const tryUnlock = async () => {
        const password = input.value;
        if (!password) {
          errorDiv.textContent = 'Please enter your master password';
          errorDiv.style.display = 'block';
          return;
        }

        // Verify password by trying to decrypt
        try {
          await window.cryptoUtils.decrypt(encryptedPassword, password);
          // Success!
          overlay.remove();
          resolve(password);
        } catch (error) {
          errorDiv.textContent = 'Incorrect master password';
          errorDiv.style.display = 'block';
          input.value = '';
          input.focus();
        }
      };

      unlockBtn.addEventListener('click', tryUnlock);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          tryUnlock();
        }
      });

      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  }

  /**
   * Show a temporary notification overlay
   */
  function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.getElementById('okta-autologin-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'okta-autologin-notification';
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      backgroundColor: type === 'warning' ? '#ff9800' : type === 'info' ? '#2196F3' : '#4CAF50',
      color: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: '10000',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '300px',
      animation: 'slideIn 0.3s ease-out'
    });

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
})();
