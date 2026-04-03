# Password Encryption

The extension now encrypts your password before storing it in `chrome.storage.local`.

## What Changed

**Before:**
```javascript
chrome.storage.local.set({ password: 'my-password' })
// Stored as: "my-password" (plain text)
```

**After:**
```javascript
const encrypted = await encrypt('my-password')
chrome.storage.local.set({ password: encrypted })
// Stored as: "aBcD1234...XyZ=" (base64-encoded encrypted data)
```

## How It Works

### Encryption Method

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Initialization Vector**: Random 12-byte IV for each encryption
- **Encoding**: Base64 for storage

### Technical Details

1. **Passphrase** (stored in `crypto.js`): A static passphrase in the extension code
2. **Salt** (stored in `crypto.js`): A static salt value
3. **Key Derivation**: Passphrase + Salt → PBKDF2 → AES-GCM key
4. **Encryption**: Password + Key + Random IV → Encrypted data
5. **Storage**: Base64(IV + Encrypted data) → `chrome.storage.local`

### Example

**Plain text password:**
```
MySecurePassword123
```

**Stored encrypted (example):**
```
qJ8K3mP9vXwR2nHgT5uY8LzC1fDpW6xAoI4bN7sE0jMhV=
```

## Security Properties

### What This Protects Against

✅ **Casual inspection** of `chrome.storage.local` database
- Someone opening the storage file won't see plain text passwords
- Requires them to also read the extension code and implement decryption

✅ **Accidental exposure**
- If storage is backed up or synced, password isn't in plain text
- Logs or debugging tools won't show plain text passwords

✅ **Basic obfuscation**
- Makes it harder for non-technical attackers
- Adds an additional layer of defense

### What This Does NOT Protect Against

❌ **Determined attacker reading extension code**
- The encryption key is derived from a passphrase in `crypto.js`
- Anyone can read `crypto.js` and extract the passphrase
- They could decrypt the password if they have both the code and storage

❌ **Malware with code execution**
- Malware can run the extension's decrypt function
- Or intercept the password when it's decrypted in memory

❌ **Physical access to unlocked computer**
- DevTools can still run: `chrome.storage.local.get(console.log)` + decrypt
- The decryption key is in the code, so it's accessible

## Security Level

This encryption provides **obfuscation**, not true security against determined attackers.

**Think of it like:**
- 🔓 Plain text: Anyone can read it (like an open book)
- 🔐 This encryption: Locked with a key that's in the same room (like a locked safe where the key is on top)
- 🔒 True security: Would need external key (like a safe requiring your fingerprint)

## Why Not Full Security?

To achieve **true security**, we'd need:

1. **External key source**:
   - Master password (you enter once per session)
   - OS keychain (macOS Keychain, Windows Credential Manager)
   - Biometric (fingerprint/Face ID)

2. **Trade-offs**:
   - ❌ Loses "fully automated" goal (you'd need to unlock)
   - ❌ More complex implementation
   - ❌ Platform-specific code needed

The current encryption is a **pragmatic middle ground**:
- Better than plain text
- Doesn't sacrifice automation
- Simple to implement

## Viewing Encrypted Password

To see what's stored:

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Inspect views: service worker" for Okta Auto-Login
4. In console:
   ```javascript
   chrome.storage.local.get(['password'], console.log)
   // Output: { password: "aBcD1234...XyZ=" }
   ```

You'll see base64-encoded encrypted data, not your password.

## Customizing the Encryption Key

For additional security through obscurity, you can change the passphrase:

1. Open `crypto.js`
2. Find `CRYPTO_CONFIG`
3. Change the `passphrase` to your own unique value:
   ```javascript
   passphrase: 'your-custom-secret-phrase-here-make-it-long-and-unique'
   ```
4. Reload the extension
5. Re-enter your password in the popup

**Note**: This makes it harder for someone to decrypt, but they can still read the code and find your custom passphrase.

## Migration

The extension automatically migrates plain text passwords to encrypted:

- If you had a password saved before this update
- On first popup open, it will encrypt it automatically
- You'll see: `[Okta Auto-Login] Migrated plain text password to encrypted`

## Comparison to Other Storage Methods

| Method | Encryption | Key Location | Security Level |
|--------|-----------|--------------|----------------|
| Plain text | None | N/A | ⭐ Low |
| **This implementation** | AES-GCM | In code | ⭐⭐ Medium (obfuscation) |
| Master password | AES-GCM | In memory (user enters) | ⭐⭐⭐ High |
| OS Keychain | OS-managed | OS-managed | ⭐⭐⭐⭐ Very High |
| 1Password/LastPass | Strong | External server + master | ⭐⭐⭐⭐⭐ Highest |

## Summary

The password is now **encrypted at rest**, which is better than plain text. However, since the decryption key is in the extension code, this provides **obfuscation rather than cryptographic security**.

For the use case (automated Okta login), this is a reasonable trade-off between:
- ✅ Security (better than plain text)
- ✅ Automation (no master password needed)
- ✅ Simplicity (no external dependencies)

If you need stronger security, consider:
1. Using OS keychain integration (more complex)
2. Adding master password protection (loses full automation)
3. Using a dedicated password manager extension
