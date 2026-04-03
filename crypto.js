// Encryption/decryption for credential storage with master password
// Uses Web Crypto API with AES-GCM

const CRYPTO_CONFIG = {
  // Static salt for key derivation
  salt: 'okta-auto-login-v2-master-password-salt-2024',
  // Higher iterations for master password security
  iterations: 100000
};

/**
 * Derive an encryption key from the master password
 * @param {string} masterPassword - User's master password
 * @param {string} salt - Salt for key derivation
 */
async function deriveKey(masterPassword, salt) {
  const enc = new TextEncoder();

  // Import master password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: CRYPTO_CONFIG.iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string with master password
 * @param {string} plaintext - The string to encrypt
 * @param {string} masterPassword - User's master password
 * @returns {Promise<string>} Base64-encoded encrypted data
 */
async function encrypt(plaintext, masterPassword) {
  const enc = new TextEncoder();
  const key = await deriveKey(masterPassword, CRYPTO_CONFIG.salt);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a string with master password
 * @param {string} encryptedBase64 - Base64-encoded encrypted data
 * @param {string} masterPassword - User's master password
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decrypt(encryptedBase64, masterPassword) {
  const key = await deriveKey(masterPassword, CRYPTO_CONFIG.salt);

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  // Convert to string
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

// Export functions
window.cryptoUtils = { encrypt, decrypt };
