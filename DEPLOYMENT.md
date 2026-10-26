# Deployment

## Vercel

The repository root is the project root. `vercel.json` specifies `npm ci`, `npm run build`, and output directory `dist`. The install hook installs `pricing-tool` using its own lockfile. Root `api/` functions and `middleware.js` remain server-side entry points.

```sh
npm ci
npm run quality
```

The build generates admin JavaScript, React islands, Tailwind CSS, pricing assets and the social preview before assembling public assets in `dist/`. It does not modify source code. Admin and PDF rendering both use `/pricing-tool/dist/`, so the pricing build is required.

`elitebody/` remains a separate source project. It is not built/published by this workflow; its portfolio card uses an external URL.

## Preview and release

1. Create a task branch and draft PR.
2. Wait for Quality and Vercel preview checks.
3. Check desktop/mobile pages, contact-form errors, admin authentication, pricing and PDF flow with an isolated backend.
4. Merge after human review. Production follows the existing Git integration.

`npm run deploy` explicitly invokes a manual production deployment. `scripts/deploy.sh` runs quality checks first. GitHub Actions does not deploy or use production credentials; local tests do not validate live service credentials or write to production Firestore.

## Environment

See `.env.example`. Set secrets separately for Preview and Production. The Firebase service account is backend-only. Client configuration in `assets/js/firebase-config.js` identifies the project and does not replace authorization. Passkey settings must match the intended origin and registered credentials.

Firebase rules/indexes are deployed separately, only when explicitly intended:

```sh
npx firebase deploy --only firestore:rules,firestore:indexes
```

There is no Firebase Hosting deployment in this workflow.

## Local Chromium

The social preview generator uses serverless Chromium. If a local environment cannot unpack/run it, set `SOCIAL_PREVIEW_CHROMIUM_PATH` to an installed Chrome/Chromium executable before building. Do not commit a machine-specific path.

## Generated output and rollback

Do not commit `node_modules/`, `dist/`, `pricing-tool/dist/`, `assets/react/`, `assets/css/styles.css`, `assets/js/admin-app.js` or `assets/social-preview-v2.png`. Keep both package lockfiles.

Old `/index-legacy.html` and `/projects-legacy.html` URLs redirect to current pages. Rollback uses the previous reviewed deployment/commit. Dependency cleanup reduces the current checkout; it does not rewrite Git history.
