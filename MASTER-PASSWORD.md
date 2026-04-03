# Master Password Feature

The extension now uses a **master password** for significantly improved security.

## How It Works

### First-Time Setup

1. **Reload the extension** at `chrome://extensions/`
2. **Click the extension icon** - you'll see a "🔒 Session Locked" screen
3. **Enter a master password** - choose something memorable but secure
4. **Click "Unlock"**
5. **Configure your credentials**:
   - Enter your master password in the "Master Password" field
   - Enter your Okta username
   - Enter your Okta password
6. Your Okta password is now encrypted with your master password

### Daily Usage

**First time you use Chrome each day:**
1. Click the extension icon
2. Enter your master password
3. Click "Unlock"
4. Extension is now unlocked for this browser session

**Auto-login now works automatically** until you close Chrome!

### Security Model

**Master password is stored:**
- ✅ In `chrome.storage.session` (memory only)
- ✅ Cleared when you close Chrome
- ❌ Never written to disk
- ❌ Never synced to cloud

**Your Okta password is:**
- ✅ Encrypted with your master password
- ✅ Stored in `chrome.storage.local` (encrypted)
- ❌ Cannot be decrypted without master password

## Example Flow

### Monday Morning:
```
1. Open Chrome
2. Navigate to Okta login
3. See notification: "Session locked! Click extension icon to unlock"
4. Click extension icon
5. Enter master password
6. Click "Unlock"
7. Navigate to Okta login again
8. ✅ Automatic login works!
```

### For the rest of the day:
```
- Automatic login works seamlessly
- No prompts, no clicks
- Master password stays in memory
```

### When you close Chrome:
```
- Master password cleared from memory
- Next time you open Chrome, you'll need to unlock again
```

## Security Benefits

### What This Protects Against

✅ **Someone with physical access to your computer**
- Even with DevTools, they cannot decrypt your password without the master password
- They'd see encrypted data: `qJ8K3mP9vXwR2nHgT5uY8LzC1fDpW6xAoI4bN7sE0jMhV=`

✅ **Stolen laptop (powered off)**
- Master password not stored anywhere
- Okta password cannot be decrypted

✅ **Malware reading storage files**
- Extension storage contains only encrypted password
- Requires master password to decrypt (not in storage)

✅ **Accidental exposure**
- Backups, logs, debugging tools show encrypted data only
- No plain text passwords anywhere on disk

### What This Does NOT Protect Against

❌ **Malware running while Chrome is open**
- If master password is in memory, malware could potentially access it
- But this is true of any password manager

❌ **Someone watching you type**
- Keyloggers would capture master password
- Use full-disk encryption as additional protection

## Comparison to Previous Version

| Feature | Old Version | With Master Password |
|---------|-------------|---------------------|
| Password encryption | Static key in code | Your master password |
| Key storage | In extension code | In memory only |
| Security level | ⭐⭐ Medium | ⭐⭐⭐⭐ High |
| Can decrypt without code? | Yes | No (needs master password) |
| Persists across sessions? | Yes (always available) | No (re-enter per session) |
| Automation | Fully automatic | Unlock once per session |

## FAQs

### Q: What happens if I forget my master password?

**A:** You'll need to reset your credentials:
1. Go to `chrome://extensions/`
2. Find "Okta Auto-Login"
3. Click "Details" → "Remove extension data" or just remove and reinstall
4. Set up again with a new master password

**Important:** There is no "password recovery" - this is by design for security.

### Q: Can I change my master password?

**A:** Yes!
1. Unlock the extension
2. Enter a new master password in the "Master Password" field
3. Your Okta password will be automatically re-encrypted

### Q: How strong should my master password be?

**Recommendations:**
- Minimum 12 characters
- Mix of letters, numbers, symbols
- Not used elsewhere
- Something memorable (you'll type it daily)

**Examples:**
- ❌ Bad: `password123`
- ❌ Bad: `okta`
- ✅ Good: `MyDog!Spot2024$`
- ✅ Good: `Coffee&Code@Morning99`

### Q: Does this work like 1Password or Bitwarden?

**A:** Similar concept:
- Both use master password to encrypt credentials
- Both clear master password on close
- This is simpler (only for Okta, no separate app)

### Q: What if Chrome crashes?

**A:** Master password is cleared:
- You'll need to unlock again next time
- Your encrypted Okta password is safe in storage
- Just unlock with master password to continue

### Q: Can I use the same master password as my Okta password?

**A:** Not recommended:
- If someone gets one, they have both
- Use a different password for the master password
- Adds an additional layer of security

## Technical Details

### Encryption

**Algorithm:** AES-GCM 256-bit
**Key Derivation:** PBKDF2 with 100,000 iterations
**Salt:** Static salt in code (prevents rainbow tables)

### Master Password Flow

```
Setup:
User types master password
     ↓
PBKDF2 (100,000 iterations) → Encryption key
     ↓
AES-GCM encrypt Okta password → Encrypted data
     ↓
Store encrypted data in chrome.storage.local
     ↓
Store master password in chrome.storage.session (memory)

Daily Use:
User unlocks with master password
     ↓
Master password stored in chrome.storage.session
     ↓
Content script retrieves master password from session
     ↓
Decrypt Okta password with master password
     ↓
Fill login form

Browser Close:
chrome.storage.session cleared automatically
Master password gone from memory
```

### Storage Locations

**Persistent storage** (`chrome.storage.local`):
- Encrypted Okta password: `{ password: "base64..." }`
- Username (not encrypted): `{ username: "user@posit.co" }`
- Settings: `{ enabled: true, delay: 500 }`

**Session storage** (`chrome.storage.session`):
- Master password (plain text, memory only): `{ masterPassword: "MyDog!Spot2024$" }`
- Automatically cleared when Chrome closes

## Troubleshooting

### "Incorrect master password" error

**Solution:**
- Make sure you're entering the exact master password you used during setup
- Master passwords are case-sensitive
- If forgotten, you'll need to reset (see FAQ above)

### "Session locked" notification on Okta page

**Solution:**
- Click extension icon
- Enter your master password
- Try logging in again

### Extension unlocked but auto-login not working

**Check:**
1. Extension is enabled (badge shows "ON")
2. Username and Okta password are filled in settings
3. Master password was entered correctly (try unlocking again)

## Best Practices

1. **Choose a strong, unique master password**
2. **Write it down** and keep in a safe place (while memorizing)
3. **Use disk encryption** (FileVault/BitLocker) as additional protection
4. **Lock your computer** when stepping away (Cmd+Ctrl+Q / Win+L)
5. **Close Chrome** at end of day to clear master password from memory
6. **Don't reuse** your master password anywhere else

## Summary

The master password feature provides **true security** for your credentials:

- 🔒 Master password required to decrypt
- 💾 Master password stored in memory only
- 🚫 No way to decrypt without master password
- ✅ Automatic login after one-time unlock per session
- 🔐 Similar security to commercial password managers

This is a **significant upgrade** from the previous encryption approach and provides enterprise-grade security while maintaining the convenience of automated login.
