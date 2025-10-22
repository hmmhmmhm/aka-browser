# Quick Start Guide

## 🚀 Get Started Now

### 1. Issue Developer ID Application Certificate

**Takes 5 minutes**

1. https://developer.apple.com/account/resources/certificates/list
2. Click "+" button → Select "Developer ID Application"
3. Upload CSR file (generate using method below)
4. Download and double-click to install

**How to generate CSR:**
```
Keychain Access app → Menu → Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority...
→ Enter email → Select "Saved to disk" → Save
```

### 2. Generate App-Specific Password

**Takes 2 minutes**

1. https://appleid.apple.com/account/manage
2. Security → App-Specific Passwords → "+" button
3. Enter name (e.g., "aka-browser") → Generate
4. **Copy password** (you won't be able to see it again!)

### 3. Find Your Team ID

**Takes 1 minute**

1. https://developer.apple.com/account
2. Membership Details → Copy Team ID (e.g., `AB12CD34EF`)

### 4. Set Environment Variables

Create a `.env.local` file in the project root:

```bash
# /Users/hm/Documents/GitHub/aka-browser/apps/browser/.env.local
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop
APPLE_TEAM_ID=AB12CD34EF
```

**Or** run directly in terminal:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="AB12CD34EF"
```

### 5. Build and Notarize

```bash
cd /Users/hm/Documents/GitHub/aka-browser/apps/browser
pnpm run package
```

**Build process (approx. 5-10 minutes):**
1. ✅ Build app
2. ✅ EVS signing (Widevine)
3. ✅ Code signing
4. ✅ Notarization (upload to Apple servers)
5. ✅ DMG creation

### 6. Done!

Generated file: `release/aka-browser-0.1.0-arm64.dmg`

You can now upload this file to the internet for distribution.
Users won't see the **"damaged"** message when downloading! ✨

---

## 🔍 Verify Notarization

```bash
spctl -a -vv -t install release/mac-arm64/aka-browser.app
```

On success:
```
accepted
source=Notarized Developer ID
```

---

## ❓ Troubleshooting

### Cannot Find Certificate
```bash
security find-identity -v -p codesigning
```
→ Check if "Developer ID Application" certificate exists

### Notarization Failed
- Verify Apple ID, Password, and Team ID are correct
- Ensure two-factor authentication is enabled

---

**For detailed instructions**: See `CODESIGN_SETUP.md`
