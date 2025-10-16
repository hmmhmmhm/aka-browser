# Security Policy

## Security Features

This application implements multiple layers of security to protect users:

### 1. Process Isolation
- **Context Isolation**: Enabled for all renderer processes
- **Node Integration**: Disabled to prevent direct Node.js API access
- **Sandbox**: Enabled for WebContentsView to isolate web content
- **Separate Preload Scripts**: Main window and web content use different preload scripts

### 2. Content Security Policy (CSP)
- **Main Window UI (Development)**: Relaxed CSP with `unsafe-inline` and `unsafe-eval` for Vite HMR and React DevTools
- **Main Window UI (Production)**: Strict CSP without `unsafe-inline` or `unsafe-eval`
- **WebContentsView (External Sites)**: No CSP modification - respects each website's own CSP
- Browser UI is protected while allowing external websites to function normally
- Prevents XSS attacks on the browser UI itself

### 3. URL Validation
- Protocol whitelist (only http/https allowed)
- Dangerous protocol blocking (file:, javascript:, data:, etc.)
- Domain blacklist support
- Exact domain matching to prevent subdomain bypasses
- **Localhost and private IPs allowed** - This is a developer browser, local development servers are essential

### 4. IPC Security
- Sender verification for all IPC handlers
- Only main window can send IPC messages
- WebContentsView messages are verified separately
- Security event logging for unauthorized attempts

### 5. Permission Management
- Restricted permissions (only clipboard access allowed)
- All other permissions (camera, microphone, geolocation) denied by default
- Permission requests are logged

### 6. Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` to disable sensitive features

### 7. Developer-Friendly Features
- **DevTools always available** - Essential for developers to inspect and debug web applications
- Detailed security logs only in development mode
- Localhost and private network access enabled for local development

## Security Best Practices

### For Developers

1. **Regular Dependency Updates**
   ```bash
   npm run audit        # Check for vulnerabilities
   npm run audit:fix    # Auto-fix vulnerabilities
   npm run outdated     # Check for outdated packages
   ```

2. **Before Deploying**
   - Run `npm audit` to check for vulnerabilities
   - Update dependencies to latest stable versions
   - Test in production mode: `NODE_ENV=production npm start`

3. **Adding New Features**
   - Never use `executeJavaScript` from main process
   - Always validate IPC message senders
   - Use preload scripts for safe web content interaction
   - Add new domains to blocklist if needed

### For Users

1. **Keep the App Updated**
   - Always use the latest version
   - Enable auto-updates if available

2. **Be Cautious with URLs**
   - The app blocks dangerous protocols and domains
   - If a site is blocked, there's usually a good reason

3. **Report Security Issues**
   - See "Reporting a Vulnerability" section below

## Reporting a Vulnerability

If you discover a security vulnerability, please email the maintainer directly instead of opening a public issue.

**DO NOT** create a public GitHub issue for security vulnerabilities.

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Time
- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity

## Security Checklist for Releases

- [ ] Run `npm audit` and fix all high/critical vulnerabilities
- [ ] Update all dependencies to latest stable versions
- [ ] Test all security features in production mode
- [ ] Verify CSP headers are correct
- [ ] Confirm DevTools are accessible (required for developers)
- [ ] Test URL validation with various edge cases including localhost
- [ ] Verify IPC sender validation works
- [ ] Check permission requests are properly denied
- [ ] Test local development server access (localhost, 127.0.0.1, etc.)

## Developer-Focused Design Decisions

This browser is specifically designed for developers, which influences some security decisions:

1. **DevTools Always Available**: Unlike consumer browsers, DevTools are accessible in all modes because developers need to inspect and debug web applications
2. **Localhost Access**: Local development servers (localhost, 127.0.0.1, private IPs) are fully accessible - essential for web development
3. **Clipboard Access**: Allowed by default for better developer experience
4. **Theme Color Extraction**: Uses preload script injection which is safer than `executeJavaScript` but still requires trust in the preload script

## Known Security Trade-offs

1. **DevTools in Production**: While DevTools are powerful debugging tools, they can expose sensitive information. Users should be aware of this when browsing sensitive sites
2. **Local Network Access**: Allowing private IP access means the browser can access internal network resources - useful for development but be cautious on untrusted networks

## Security Updates

This document will be updated as new security features are added or vulnerabilities are discovered.

Last updated: 2025-10-16
