# Firebase Console Setup Guide

## Critical Security Setup (Required)

These steps MUST be completed in the Firebase Console to secure your database.

---

## Step 1: Apply Firestore Security Rules

**Priority:** 🔴 CRITICAL - Do this FIRST

### Instructions:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **omeryigitler-5abfb**
3. In the left sidebar, click **Firestore Database**
4. Click on the **Rules** tab at the top
5. **Replace** the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Messages Collection - Write-only for public, Read-only for authenticated admins
    match /messages/{messageId} {
      // Allow anyone to create messages (contact form submissions)
      // But with strict validation to prevent abuse
      allow create: if request.resource.data.keys().hasAll(['name', 'email', 'message', 'timestamp'])
                    && request.resource.data.name is string
                    && request.resource.data.email is string
                    && request.resource.data.message is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 100
                    && request.resource.data.email.matches('.*@.*\\..*')
                    && request.resource.data.email.size() <= 200
                    && request.resource.data.message.size() > 0
                    && request.resource.data.message.size() <= 5000
                    && request.resource.data.status == 'new'
                    && request.resource.data.source in ['website_main_form'];
      
      // Only authenticated users can read, update, or delete
      allow read, update, delete: if request.auth != null;
    }
    
    // Stats Collection - Read for anyone, Write via increment only
    match /stats/global {
      allow read: if true;
      // Allow increment for views counter
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views'])
                    && request.resource.data.views == resource.data.views + 1;
    }
    
    match /stats/daily {
      allow read: if true;
      // Allow updates only from authenticated users or server
      allow write: if request.auth != null;
    }
    
    // Projects Collection - Read for anyone, Write only for authenticated admins
    match /projects/{projectId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish** button
7. Confirm the changes

**Expected Result:**
- ✅ Public users can only CREATE messages (not read/delete)
- ✅ All reads/updates require authentication
- ✅ Strict validation prevents spam and malformed data

---

## Step 2: Enable Firebase Authentication

**Priority:** 🔴 CRITICAL

### Instructions:

1. Still in Firebase Console, go to **Authentication** in the left sidebar
2. Click **Get Started** (if first time) or **Sign-in method** tab
3. Click on **Email/Password**
4. Toggle **Enable** to ON
5. Leave "Email link (passwordless sign-in)" OFF for now
6. Click **Save**

**Expected Result:**
- ✅ Email/Password authentication is enabled
- ✅ Ready to create admin users

---

## Step 3: Create Admin User

**Priority:** 🔴 CRITICAL

### Instructions:

1. In Firebase Console → **Authentication** → **Users** tab
2. Click **Add User** button
3. Enter your admin credentials:
   - **Email:** `your-admin-email@example.com`
   - **Password:** Use a STRONG password (at least 12 characters, mix of letters/numbers/symbols)
4. Click **Add User**
5. **IMPORTANT:** Save these credentials securely (password manager recommended)

**Expected Result:**
- ✅ Admin user created with UID
- ✅ You can use these credentials to log into admin panel

---

## Step 4: Enable EmailJS Security (Optional but Recommended)

**Priority:** 🟡 MEDIUM

### Instructions:

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Sign in to your account
3. Navigate to **Email Services**
4. Select your service (**service_z24kvj8**)
5. Under **Security**, enable:
   - ✅ **ReCAPTCHA** (Blocks bots)
   - ✅ **Rate Limiting** (Set to 10 emails per hour per IP)
6. Save changes

**Expected Result:**
- ✅ CAPTCHA will be shown before form submission
- ✅ Spam bots will be blocked automatically

---

## Step 5: Test Security Setup

**Priority:** ✅ VERIFICATION

### Test 1: Contact Form Rate Limiting

1. Go to `https://omeryigitler.com`
2. Submit the contact form **3 times** within an hour
3. On the **4th attempt**, you should see:
   ```
   Security Limit Reached: You can only submit 3 messages per hour.
   ```
4. **Expected:** Form submission blocked ✅

### Test 2: Firestore Security

1. Open Browser DevTools (F12)
2. Go to Console tab
3. Try to manually read messages:
   ```javascript
   firebase.firestore().collection('messages').get()
   ```
4. **Expected:** Permission denied error ✅

### Test 3: Admin Authentication (After Implementation)

1. Go to `https://omeryigitler.com/admin.html`
2. You should be redirected to login
3. Enter the admin credentials you created
4. **Expected:** Access granted to admin panel ✅

---

## Verification Checklist

After completing all steps, verify:

- [ ] Firestore rules are published and active
- [ ] Email/Password authentication is enabled
- [ ] Admin user is created and credentials saved
- [ ] EmailJS CAPTCHA is enabled (optional)
- [ ] Contact form rate limiting works (3/hour limit)
- [ ] Cannot read Firestore data without authentication

---

## Next Steps

Once Firebase Console setup is complete:

1. ✅ I will implement Firebase Authentication in `admin.html`
2 ✅ Replace the pattern lock with real login
3. ✅ Add logout functionality
4. ✅ Test the complete authentication flow

---

## Troubleshooting

### Issue: "Permission Denied" when submitting contact form

**Solution:**
- Check that Firestore rules are published correctly
- Verify the `source` field in the form submission matches `'website_main_form'`
- Check browser console for specific errors

### Issue: Can't log into admin panel

**Solution:**
- Verify Email/Password authentication is enabled
- Check that admin user exists in Authentication → Users
- Try resetting the password in Firebase Console

### Issue: Rate limiting not working

**Solution:**
- Clear browser localStorage: `localStorage.clear()`
- Try in incognito mode to test from fresh state
- Check browser console for JavaScript errors

---

## Security Notes

> **IMPORTANT:** Never share your Firebase admin credentials
> **IMPORTANT:** Use different passwords for production vs development
> **IMPORTANT:** Enable 2FA on your Firebase account for extra security

---

## Support

If you encounter any issues during setup:
1. Check the Firebase Console logs
2. Review browser console for error messages
3. Contact me with screenshots of any errors

This setup is CRITICAL for security - do not skip any steps!
