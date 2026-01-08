# Elite Body Protocol - Deployment Guide

This project (`elitebody` folder) is a full React application built with Vite. It needs to be deployed separately from your main portfolio website to work correctly as a subdomain.

## Step 1: Push to GitHub
Ensure you have committed and pushed your latest changes, including the new `elitebody` folder, to your GitHub repository.

```bash
git add .
git commit -m "Add Elite Body project"
git push
```

## Step 2: Create a New Project in Vercel
1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Import the **SAME repository** (`omeryigitler.com`) that you use for your main site.

## Step 3: Configure Project Settings (CRITICAL)
Before clicking "Deploy", you must configure the settings to tell Vercel this project is inside a subfolder.

1.  **Project Name:** Enter `elitebody` (or whatever you prefer).
2.  **Framework Preset:** Vercel should auto-detect **Vite**, but if not, select it.
3.  **Root Directory:**
    *   Click "Edit" next to Root Directory.
    *   Select the `elitebody` folder.
4.  **Environment Variables:**
    *   Check the `.env.local` file inside the `elitebody` folder.
    *   If there are API keys (like `VITE_GEMINI_API_KEY`), add them here in the Vercel "Environment Variables" section.

## Step 4: Deploy
Click **"Deploy"**. Vercel will build only the React app in that folder.

## Step 5: Connect Subdomain
1.  Once deployed, go to the project's **Settings** -> **Domains**.
2.  Enter `elitebody.omeryigitler.com`.
3.  Vercel will give you DNS records (usually a CNAME record intended for `cname.vercel-dns.com`).
4.  Add this CNAME record to your DNS provider (where you bought your domain).

## Notes
*   **Projects Page:** I have already updated your main `projects.html` to link to `https://elitebody.omeryigitler.com`. Once you finish the steps above, that link will work!
*   **Visuals:** I have captured screenshots of the app and added them to your portfolio page automatically.
