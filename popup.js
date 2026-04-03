// Popup logic with master password protection
document.addEventListener('DOMContentLoaded', async () => {
  // Get references to all elements
  const masterPasswordSection = document.getElementById('master-password-section');
  const masterPasswordInput = document.getElementById('master-password-input');
  const unlockButton = document.getElementById('unlock-button');
  const unlockError = document.getElementById('unlock-error');
  const mainSettings = document.getElementById('main-settings');

  const enabledToggle = document.getElementById('enabled-toggle');
  const masterPasswordSetupInput = document.getElementById('master-password-setup-input');
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const delayInput = document.getElementById('delay-input');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  let masterPassword = null;

  // Check if we have a master password in session storage
  const sessionData = await chrome.storage.session.get(['masterPassword']);

  if (sessionData.masterPassword) {
    // Already unlocked this session
    masterPassword = sessionData.masterPassword;
    await showMainSettings();
  } else {
    // Need to unlock
    showMasterPasswordPrompt();
  }

  // Unlock button handler
  unlockButton.addEventListener('click', async () => {
    const enteredPassword = masterPasswordInput.value;

    if (!enteredPassword) {
      showUnlockError('Please enter your master password');
      return;
    }

    // Try to verify the master password by decrypting stored password
    const settings = await chrome.storage.local.get(['password']);

    if (!settings.password) {
      // No password stored yet - this is first time setup
      // Accept any master password
      masterPassword = enteredPassword;
      await chrome.storage.session.set({ masterPassword });
      console.log('[Okta Auto-Login] Master password set for session (first-time setup)');
      await showMainSettings();
      return;
    }

    // Try to decrypt with entered master password
    try {
      await window.cryptoUtils.decrypt(settings.password, enteredPassword);
      // Success! Master password is correct
      masterPassword = enteredPassword;
      await chrome.storage.session.set({ masterPassword });
      console.log('[Okta Auto-Login] Session unlocked');
      await showMainSettings();
    } catch (error) {
      // Failed to decrypt - wrong master password
      showUnlockError('Incorrect master password');
      masterPasswordInput.value = '';
      masterPasswordInput.focus();
    }
  });

  // Allow Enter key to unlock
  masterPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      unlockButton.click();
    }
  });

  function showMasterPasswordPrompt() {
    masterPasswordSection.style.display = 'block';
    mainSettings.style.display = 'none';
    masterPasswordInput.focus();
  }

  function showUnlockError(message) {
    unlockError.textContent = message;
    unlockError.style.display = 'block';
    setTimeout(() => {
      unlockError.style.display = 'none';
    }, 3000);
  }

  async function showMainSettings() {
    masterPasswordSection.style.display = 'none';
    mainSettings.style.display = 'block';

    // Load saved settings
    const settings = await chrome.storage.local.get(['enabled', 'username', 'password', 'delay']);

    enabledToggle.checked = settings.enabled !== false; // Default to true
    usernameInput.value = settings.username || '';
    delayInput.value = settings.delay || 500;

    // Decrypt password if it exists
    if (settings.password && masterPassword) {
      try {
        const decryptedPassword = await window.cryptoUtils.decrypt(settings.password, masterPassword);
        passwordInput.value = decryptedPassword;
      } catch (error) {
        console.error('[Okta Auto-Login] Failed to decrypt password:', error);
        passwordInput.value = '';
      }
    }

    // Update status display
    updateStatus(enabledToggle.checked, settings.username, settings.password);
  }

  // Save settings when toggle changes
  enabledToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ enabled });
    const settings = await chrome.storage.local.get(['username', 'password']);
    updateStatus(enabled, settings.username, settings.password);

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'settingsChanged',
      enabled
    });
  });

  // Save master password setup (used when saving Okta password)
  masterPasswordSetupInput.addEventListener('change', async (e) => {
    const newMasterPassword = e.target.value;
    if (newMasterPassword && newMasterPassword !== masterPassword) {
      // Master password changed - need to re-encrypt Okta password if it exists
      const currentPassword = passwordInput.value;

      masterPassword = newMasterPassword;
      await chrome.storage.session.set({ masterPassword });

      if (currentPassword) {
        // Re-encrypt with new master password
        const encryptedPassword = await window.cryptoUtils.encrypt(currentPassword, masterPassword);
        await chrome.storage.local.set({ password: encryptedPassword });
        console.log('[Okta Auto-Login] Password re-encrypted with new master password');
      }
    }
  });

  // Save username
  usernameInput.addEventListener('change', async (e) => {
    const username = e.target.value.trim();
    await chrome.storage.local.set({ username });
    const settings = await chrome.storage.local.get(['password']);
    updateStatus(enabledToggle.checked, username, settings.password);
  });

  // Save password (encrypted with master password)
  passwordInput.addEventListener('change', async (e) => {
    const password = e.target.value;

    // Get master password from setup field or session
    const currentMasterPassword = masterPasswordSetupInput.value || masterPassword;

    if (!currentMasterPassword) {
      alert('Please set a master password first');
      passwordInput.value = '';
      masterPasswordSetupInput.focus();
      return;
    }

    if (password) {
      // Encrypt password with master password before storing
      const encryptedPassword = await window.cryptoUtils.encrypt(password, currentMasterPassword);
      await chrome.storage.local.set({ password: encryptedPassword });

      // Update session master password if changed
      if (masterPasswordSetupInput.value) {
        masterPassword = masterPasswordSetupInput.value;
        await chrome.storage.session.set({ masterPassword });
      }

      console.log('[Okta Auto-Login] Password encrypted and stored');
    } else {
      await chrome.storage.local.set({ password: '' });
    }

    const settings = await chrome.storage.local.get(['username']);
    updateStatus(enabledToggle.checked, settings.username, password);
  });

  // Save delay setting
  delayInput.addEventListener('change', async (e) => {
    const delay = parseInt(e.target.value, 10);
    await chrome.storage.local.set({ delay });
  });

  function updateStatus(enabled, username, password) {
    const hasCredentials = username && password;

    if (enabled && hasCredentials) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Auto-login is enabled and configured';
    } else if (enabled && !hasCredentials) {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Enabled but missing credentials';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Auto-login is disabled';
    }
  }
});
