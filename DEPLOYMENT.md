# Deployment Guide - Firebase Hosting

> **Complete deployment guide** from development to production.

---

## 🎯 Overview

Deploy the Admin Panel Workflow System to Firebase Hosting with custom domain, SSL, and CI/CD pipeline.

**Estimated Time**: 1-2 hours (first deployment)

---

## 📋 Prerequisites

### Required
- ✅ Firebase project (existing)
- ✅ Node.js 16+ installed
- ✅ Git repository
- ✅ Firebase CLI access

### Optional
- ⭕ Custom domain
- ⭕ GitHub account (for CI/CD)

---

## 🔧 Step 1: Install Firebase CLI

### MacOS/Linux
```bash
npm install -g firebase-tools
```

### Verify Installation
```bash
firebase --version
# Should show: 13.x.x or higher
```

---

## 🔐 Step 2: Firebase Login

```bash
firebase login
```

**Follow prompts**:
1. Browser opens
2. Select Google account
3. Grant permissions
4. Return to terminal

**Verify**:
```bash
firebase projects:list
```

---

## 🏗️ Step 3: Initialize Hosting

### Navigate to Project
```bash
cd /Users/omeryigitler/Downloads/omeryigitler.com
```

### Initialize Firebase
```bash
firebase init hosting
```

**Interactive Setup**:
```
? Select Firebase project: 
  → Use existing project (select yours)

? What do you want to use as your public directory?
  → . (current directory)

? Configure as a single-page app (rewrite all urls to /index.html)?
  → No

? Set up automatic builds and deploys with GitHub?
  → No (manual for now)

? File admin.html already exists. Overwrite?
  → No

? File index.html already exists. Overwrite?
  → No
```

### Generated Files
- `firebase.json` - Hosting configuration
- `.firebaserc` - Project configuration

---

## ⚙️ Step 4: Configure firebase.json

Edit `firebase.json`:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "pricing-tool/src/**",
      "pricing-tool/node_modules/**"
    ],
    "rewrites": [],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp|svg|css|js)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**Key Settings**:
- `public: "."` - Deploy from current directory
- `ignore` - Exclude source files
- `headers` - Enable 1-year cache for assets

---

## 🧪 Step 5: Test Locally

```bash
firebase serve --only hosting
```

**Expected Output**:
```
✔  hosting: Local server: http://localhost:5000
```

**Test**:
1. Open `http://localhost:5000/admin.html`
2. Verify all features work
3. Check console for errors
4. Press `Ctrl+C` to stop

---

## 🚀 Step 6: Deploy to Firebase

### First Deployment

```bash
firebase deploy --only hosting
```

**Expected Output**:
```
=== Deploying to 'your-project'...

i  deploying hosting
✔  hosting[your-project]: file upload complete
i  hosting[your-project]: finalizing version...
✔  hosting[your-project]: version finalized
i  hosting[your-project]: releasing new version...
✔  hosting[your-project]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
Hosting URL: https://your-project.web.app
```

### Verify Deployment

1. Open provided URL: `https://your-project.web.app`
2. Test `https://your-project.web.app/admin.html`
3. Login via gateway
4. Verify Firestore connection

---

## 🌐 Step 7: Custom Domain (Optional)

### Add Domain in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Hosting** → **Add custom domain**
4. Enter domain: `admin.omeryigitler.com`
5. Copy DNS records provided

### Configure DNS

**For Cloudflare** (example):
```
Type: A
Name: admin
Value: 151.101.1.195 (Firebase IP)

Type: A
Name: admin
Value: 151.101.65.195 (Firebase IP)
```

**For Other Providers**:
Follow Firebase-provided instructions

### Verify Domain

1. Click **Verify** in Firebase Console
2. Wait for DNS propagation (5 mins - 48 hours)
3. SSL certificate auto-provisioned
4. Domain status: **Connected**

### Access via Custom Domain

`https://admin.omeryigitler.com`

---

## 🔄 Step 8: Deploy Firestore Indexes

### Check Required Indexes

Firebase Console → **Firestore** → **Indexes**

**Create Missing Indexes**:

#### clients collection
```
Collection: clients
Fields: email (Ascending), lastContactDate (Descending)
Query Scope: Collection
```

#### messages collection
```
Collection: messages
Fields: clientId (Ascending), timestamp (Descending)
```

```
Collection: messages
Fields: status (Ascending), timestamp (Descending)
```

#### quotes collection
```
Collection: quotes
Fields: clientId (Ascending), createdAt (Descending)
```

```
Collection: quotes
Fields: status (Ascending), createdAt (Descending)
```

#### projects collection
```
Collection: projects
Fields: clientId (Ascending), createdAt (Descending)
```

### Deploy via CLI (Alternative)

Create `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "clients",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "email", "order": "ASCENDING"},
        {"fieldPath": "lastContactDate", "order": "DESCENDING"}
      ]
    }
  ]
}
```

Deploy:
```bash
firebase deploy --only firestore:indexes
```

---

## 🔒 Step 9: Security Hardening

### Enable Firebase App Check

1. Firebase Console → **App Check**
2. Click **Register**
3. Select **reCAPTCHA v3**
4. Add site key to `admin.html`:

```javascript
const appCheck = firebase.appCheck();
appCheck.activate(
  'YOUR_RECAPTCHA_SITE_KEY',
  true // Auto-refresh token
);
```

### Review Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Verify rules protect sensitive data.

### Environment Variables

Create `.env.production`:
```
FIREBASE_API_KEY=your_production_key
RECAPTCHA_SITE_KEY=your_recaptcha_key
```

**Do NOT commit** `.env` files to Git!

Add to `.gitignore`:
```
.env*
firebase-config.js
```

---

## 🤖 Step 10: CI/CD with GitHub Actions

### Create Workflow File

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies (pricing-tool)
        run: |
          cd pricing-tool
          npm ci
          npm run build
          cd ..
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

### Add Firebase Service Account

1. Firebase Console → **Project Settings** → **Service Accounts**
2. Click **Generate New Private Key**
3. Download JSON file
4. GitHub Repo → **Settings** → **Secrets** → **Actions**
5. Add secret: `FIREBASE_SERVICE_ACCOUNT` = (paste JSON content)

### Test Workflow

```bash
git add .github/workflows/deploy.yml
git commit -m "Add CI/CD workflow"
git push origin main
```

Watch deployment: **Actions** tab in GitHub

---

## 📊 Step 11: Monitoring & Analytics

### Firebase Performance Monitoring

Add to `admin.html`:
```javascript
const perf = firebase.performance();
```

### Google Analytics (Optional)

```javascript
const analytics = firebase.analytics();
analytics.logEvent('page_view', {page: 'admin'});
```

---

## 🔄 Update & Rollback

### Deploy Update

```bash
# Make changes
git add .
git commit -m "Update feature"
firebase deploy --only hosting
```

### Rollback to Previous Version

Firebase Console → **Hosting** → **Release History**
- Click three dots (⋮) on previous version
- Click **Rollback**

---

## ✅ Deployment Checklist

- [ ] Firebase CLI installed
- [ ] Logged into Firebase
- [ ] `firebase init hosting` completed
- [ ] Local test successful (`firebase serve`)
- [ ] Production deployment successful
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Firestore indexes created
- [ ] Security rules deployed
- [ ] App Check enabled (optional)
- [ ] CI/CD pipeline setup (optional)
- [ ] Monitoring enabled

---

## 🐛 Troubleshooting

### Error: "Permission Denied"
**Solution**: Run `firebase login` again

### Error: "Deployment Failed"
**Solution**: Check `firebase.json` syntax, ensure no syntax errors

### SSL Certificate Not Provisioning
**Solution**: Wait 24-48 hours, verify DNS records correct

### Custom Domain Not Working
**Solution**: 
1. Check DNS propagation: `nslookup admin.omeryigitler.com`
2. Clear browser cache
3. Try incognito mode

---

## 📞 Support Resources

- Firebase Documentation: https://firebase.google.com/docs/hosting
- Firebase Status: https://status.firebase.google.com/
- Community Forum: https://stackoverflow.com/questions/tagged/firebase

---

**Last Updated**: January 24, 2026  
**Version**: 1.0
