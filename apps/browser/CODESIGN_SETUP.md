# Code Signing and Notarization Setup Guide

This document explains how to set up code signing and notarization for distributing aka-browser on macOS.

## 1. Create Developer ID Application Certificate

### 1-1. Generate CSR (Certificate Signing Request)

1. Open **Keychain Access** app
2. Menu: **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority...**
3. Enter the following information:
   - User Email Address: Your Apple Developer account email
   - Common Name: Your name
   - CA Email Address: Leave empty
   - Select **"Saved to disk"**
   - Check **"Let me specify key pair information"**
4. Choose save location (e.g., `~/Desktop/CertificateSigningRequest.certSigningRequest`)
5. Key Size: **2048 bits**, Algorithm: **RSA**
6. Click **Continue**

### 1-2. Issue Certificate from Apple Developer Website

1. Visit https://developer.apple.com/account/resources/certificates/list
2. Click **"+"** button
3. Select **"Developer ID Application"** (for distribution outside Mac App Store)
4. Click **Continue**
5. Upload the CSR file created above
6. Click **Continue**
7. Download certificate (`.cer` file)
8. **Double-click** the downloaded file to install it in Keychain

### 1-3. Verify Certificate

Verify the certificate is installed by running this command in Terminal:

```bash
security find-identity -v -p codesigning
```

You should see output like:
```
1) XXXXXX "Developer ID Application: Your Name (TEAM_ID)"
```

## 2. Generate App-Specific Password

An App-Specific Password is required for notarization.

1. Visit https://appleid.apple.com/account/manage
2. **Sign in** (Two-factor authentication required)
3. Click **App-Specific Passwords** in the **Security** section
4. Click **"+"** button
5. Enter a name (e.g., "aka-browser notarization")
6. Copy the generated password (e.g., `abcd-efgh-ijkl-mnop`)
7. **Save it securely** (you won't be able to see it again)

## 3. Find Your Team ID

1. Visit https://developer.apple.com/account
2. Find your **Team ID** in the **Membership Details** section (e.g., `AB12CD34EF`)

## 4. Set Environment Variables

### 4-1. Method 1: .env File (Recommended)

Create a `.env.local` file in the project root:

```bash
# /Users/hm/Documents/GitHub/aka-browser/apps/browser/.env.local
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop
APPLE_TEAM_ID=AB12CD34EF
```

**Warning**: Add `.env.local` to `.gitignore` to prevent committing it to Git!

### 4-2. Method 2: System Environment Variables

Add to `~/.zshrc` or `~/.bash_profile`:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="AB12CD34EF"
```

After saving:
```bash
source ~/.zshrc
```

### 4-3. Method 3: Specify During Build

```bash
APPLE_ID="your@email.com" \
APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop" \
APPLE_TEAM_ID="AB12CD34EF" \
pnpm run package
```

## 5. Build and Notarize

### 5-1. Install Dependencies

```bash
cd /Users/hm/Documents/GitHub/aka-browser/apps/browser
pnpm install
```

### 5-2. Compile Build Scripts

```bash
pnpm run build:scripts
```

### 5-3. Build and Notarize App

```bash
pnpm run package
```

Build process:
1. ✅ Build app
2. ✅ EVS signing (Widevine CDM)
3. ✅ Code signing (Developer ID Application)
4. ✅ Notarization (upload to Apple servers)
5. ✅ DMG creation

### 5-4. Verify Notarization

After the build completes, verify notarization status with:

```bash
spctl -a -vv -t install release/mac-arm64/aka-browser.app
```

Successful output:
```
release/mac-arm64/aka-browser.app: accepted
source=Notarized Developer ID
```

## 6. Troubleshooting

### Cannot Find Certificate

```
Error: Cannot find identity matching "Developer ID Application"
```

**Solution**:
1. Verify the certificate is installed in Keychain
2. Check if the certificate has expired
3. Run `security find-identity -v -p codesigning` to verify

### Notarization Failed

```
Error: Notarization failed
```

**Solution**:
1. Verify Apple ID, App-Specific Password, and Team ID are correct
2. Ensure two-factor authentication is enabled
3. Check if App-Specific Password is valid (it may have expired)

### Check Notarization Logs

```bash
xcrun notarytool log --apple-id "your@email.com" \
  --password "abcd-efgh-ijkl-mnop" \
  --team-id "AB12CD34EF" \
  <submission-id>
```

## 7. Distribution

Notarized DMG files are created in the `release/` directory:

- `release/aka-browser-0.1.0-arm64.dmg` (Apple Silicon)
- `release/aka-browser-0.1.0-x64.dmg` (Intel)
- `release/aka-browser-0.1.0-universal.dmg` (Universal)

You can upload these files to the internet for distribution. Users won't see the "damaged" message when downloading and installing.

## 8. Security Precautions

- ❌ **NEVER commit to Git**:
  - App-Specific Password
  - `.env.local` file
  - Certificate files (`.p12`, `.cer`)

- ✅ **Store securely**:
  - Use password managers like 1Password or Bitwarden
  - Use encrypted channels when sharing with team members

## 9. CI/CD Setup (GitHub Actions)

Add the following variables to GitHub Secrets:

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `CSC_LINK` (certificate `.p12` file encoded in base64)
- `CSC_KEY_PASSWORD` (certificate password)

For detailed setup, refer to the electron-builder documentation:
https://www.electron.build/code-signing

---

**Questions**: Please create an issue if you encounter any problems.
