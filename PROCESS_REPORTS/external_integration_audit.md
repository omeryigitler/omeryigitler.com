# EXTERNAL INTEGRATION AUDIT & MANUAL VERIFICATION GUIDE
**Target:** omeryigitler.com
**Date:** 2026-01-10
**Status:** COMPLETE AUDIT

---

## 1. CRITICAL EXTERNAL SERVICES (REQUIRES DATA MATCHING)

### 1.1 DATABASE: Google Firebase (Firestore & Auth)
*   **Role:** The Backbone (Data, Auth, Signals).
*   **Config ID:** `omeryigitler-5abfb`
*   **Connections:**
    *   `gateway.html` (Read/Write `auth_requests`)
    *   `taurus-tracker.js` (Read/Write `visitors_v1`)
    *   `index.html` (Write `messages`, `stats`)
    *   `api/gateway.js` (Server-side Admin Access)
*   **MANUAL VERIFICATION CHECKLIST:**
    *   [ ] **Console:** Go to Firebase Console -> Authentication -> Sign-in Method. **Enable Anonymous**.
    *   [ ] **Console:** Go to Firestore Database -> Rules. Paste content of `firestore.rules`.
    *   [ ] **Console:** Go to Project Settings -> Service Accounts. Ensure a key exists (though code uses a fallback).

### 1.2 MESSAGING: Telegram Bot API
*   **Role:** Admin Control Panel.
*   **Bot Token:** `8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE`
*   **Chat ID:** `6886010817`
*   **Connections:**
    *   `gateway.html` (Sends Verification Request)
    *   `api/webhook.js` (Receives Admin Click)
    *   `set_webhook.html` (Config Tool)
*   **MANUAL VERIFICATION CHECKLIST:**
    *   [ ] **Webhook:** Open `https://omeryigitler.com/set_webhook.html`. Enter `https://omeryigitler.com`. Click Set. Result must be "OK".
    *   [ ] **Bot:** Open Telegram `@OmerSecurityBot`. Send `/start`.

### 1.3 EMAIL: EmailJS
*   **Role:** Contact Form Delivery System.
*   **Service ID:** `service_z24kvj8`
*   **Template ID:** `template_frpxeef`
*   **Public Key:** `V1YT-CYD1Y7eX0BIE`
*   **File:** `index.html` (Lines 88-94)
*   **MANUAL VERIFICATION CHECKLIST:**
    *   [ ] **Dashboard:** Login to EmailJS. Check if "Service ID" matches.
    *   [ ] **Dashboard:** Check if "Template ID" matches.
    *   [ ] **Quota:** Check if you have monthly sends remaining.

### 1.4 ANALYTICS: Google Analytics 4
*   **Role:** Visitor Traffic Recording.
*   **Measurement ID:** `G-516666531`
*   **Files:** `index.html`, `gateway.html`
*   **MANUAL VERIFICATION CHECKLIST:**
    *   [ ] **Dashboard:** Go to GA4 Admin. Verify Data Stream ID matches `G-516666531`.

---

## 2. API & ASSET DEPENDENCIES (AUTO-CONNECTED)

### 2.1 IP Geolocation Services
*   **`https://api.ipify.org`**: Used in `gateway.html` to show your IP in Telegram when requesting access.
*   **`https://ipapi.co/json/`**: Used in `taurus-tracker.js` to get city/country data for visitors.
    *   *Note:* Free tier has rate limits. If exceeded, location shows as "Unknown".

### 2.2 Content Delivery Networks (CDNs)
*   **Fonts:** `fonts.googleapis.com` (Syncopate, Manrope)
*   **Icons:** `unpkg.com` (Lucide Icons)
*   **Audio:** `assets.mixkit.co` (Alarm Sound in `taurus-tracker.js`)
*   **Firebase SDK:** `www.gstatic.com`

---

## 3. HOSTING INFRASTRUCTURE (VERCEL)

### 3.1 Serverless Functions
*   **`api/gateway.js`**: Consolidates Logic.
*   **`api/webhook.js`**: Handles Telegram.
*   **MANUAL VERIFICATION:**
    *   [ ] **Vercel Dashboard:** Check "Functions" tab. Ensure no execution errors.
    *   [ ] **Settings:** Environment Variables are OPTIONAL (code has fallbacks), but `FIREBASE_PRIVATE_KEY` is recommended for security rotation.

---

## 4. FAILURE POINTS & DIAGNOSIS

| Symptom | Probable Cause | Fix |
| :--- | :--- | :--- |
| **Email not arriving** | EmailJS Quota exceeded OR Template ID mismatch. | Check EmailJS Dashboard. |
| **Gateway "Permission not giving"** | Vercel Webhook not firing (Deployment issue). | Push code to GitHub (Done). |
| **Gateway "Init Error"** | Firebase Auth "Anonymous" disabled. | Enable in Firebase Console. |
| **Tracker "Alarm" doesn't work locally** | Firestore Rule blocking `visitors_v1`. | Update Rules (Done). |
| **Telegram buttons do nothing** | Webhook URL pointing to wrong address (e.g. Netlify). | Use `set_webhook.html` to reset to Vercel. |

---

**AUDIT CONCLUSION:**
The codebase is correctly wired to these external services. The primary failure mode is **Configuration Mismatch** (e.g., Template IDs changing, Quotas exceeding, or Webhook URLs drifting). Use the checklists above to verify the external platforms align with the code.
