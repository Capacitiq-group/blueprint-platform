# Deployment Guide — Supabase + Vercel (mobile-friendly)

This walks through going from this zip file to a live, working platform,
assuming you're doing this from a phone with no PC/laptop. Every step below
can be done from a mobile browser. You do not need a terminal for the core
path — the terminal-based options are offered as alternatives where relevant.

---

## Step 1 — Get the code into a GitHub repository

Vercel deploys from a Git repository, so the code needs to live in GitHub,
GitLab, or Bitbucket first.

**Easiest path on mobile: GitHub's web upload**
1. Unzip this download so you have the plain `blueprint/` folder (most
   phone file managers, and the Files app on iOS, can unzip in place —
   look for "Extract" or "Uncompress" on the zip file).
2. Go to github.com on your phone browser, sign in, and create a new
   **private** repository (e.g. `blueprint-platform`).
3. On the new repo's page, use "uploading an existing file" (GitHub shows
   this link on an empty repo's main page) and upload the contents of the
   unzipped folder. GitHub's web uploader accepts drag-and-drop / file
   picker in batches — you may need to do this in a few batches if your
   phone's file picker limits selection size, and you can create
   subfolders by typing the path into the filename field of the uploader
   (e.g. typing `lib/ai/provider.ts` as the filename when uploading
   `provider.ts` places it in that folder).
4. Commit directly to `main`.

**Alternative: GitHub mobile app** — it supports browsing and committing
individual files, but bulk-uploading a whole folder tree is more reliably
done through the web uploader described above.

**Alternative: a mobile terminal (Termux on Android, iSH on iOS)** — if
you're comfortable with a shell, standard `git init`, `git remote add
origin ...`, `git push` works identically to a desktop.

---

## Step 2 — Create the Supabase project

1. Go to supabase.com, sign in, **New project**.
2. Choose a name, a strong database password (save it — you'll need it for
   `SUPABASE_DB_URL`), and a region close to you or your users.
3. Wait for provisioning (a couple of minutes).

## Step 3 — Run the database schema

1. In your Supabase project, open **SQL Editor** (left sidebar).
2. Open `supabase/migrations/0001_init.sql` from this project (view it on
   GitHub, or in your phone's file manager) and copy its entire contents.
3. Paste into a new SQL Editor query and press **Run**.
4. You should see it complete without errors. This creates every table,
   index, and Row Level Security policy the app needs — there is nothing
   else to configure in Supabase beyond this file.

## Step 4 — Collect your Supabase keys

In Supabase → **Project Settings → API**, note down:
- **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** (click "Reveal") → this is `SUPABASE_SERVICE_ROLE_KEY` — keep this one secret, never put it in anything client-facing

In **Project Settings → Database → Connection string**, copy the **URI**
format connection string → this is `SUPABASE_DB_URL` (fill in the database
password you set in Step 2 where the string has a placeholder).

## Step 5 — Get a Kimi (Moonshot AI) API key

Sign up at the Moonshot AI platform and generate an API key. This becomes
`KIMI_API_KEY`.

## Step 6 — Deploy to Vercel

1. Go to vercel.com, sign in (GitHub sign-in is simplest — it gives Vercel
   direct access to import the repo).
2. **Add New → Project**, select the `blueprint-platform` repository you
   created in Step 1.
3. Vercel auto-detects Next.js — leave the build settings as default.
4. Before deploying, open **Environment Variables** and add every variable
   from `.env.example` with your real values from Steps 4–5:

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_DB_URL
   AI_PROVIDER=kimi
   KIMI_API_KEY
   KIMI_API_BASE_URL=https://api.moonshot.ai/v1
   KIMI_MODEL=moonshot-v1-32k
   NEXT_PUBLIC_APP_URL          (fill in after first deploy, see below)
   NEXT_PUBLIC_APP_NAME=Blueprint
   ```
5. Click **Deploy**. Wait for the build to finish.
6. Vercel gives you a URL like `blueprint-platform.vercel.app`. Go back into
   **Settings → Environment Variables**, set `NEXT_PUBLIC_APP_URL` to that
   URL, and redeploy (Vercel → Deployments → ⋯ → Redeploy) so the value is
   picked up.

## Step 7 — Create your user account

You need one authenticated account to log in — there is no public sign-up
page by design.

**From Vercel, no terminal needed:** Vercel projects can run one-off
commands from the dashboard under some plans, but the simplest reliable
mobile path is:

1. On your phone, open a terminal app (Termux on Android works well; on
   iOS, consider a cloud shell like Replit's shell, or GitHub Codespaces
   opened from your phone's browser — Codespaces gives you a full
   browser-based VS Code + terminal against your repo, no local install at
   all).
2. Clone your repo (or open it in Codespaces, which clones automatically),
   run:
   ```
   npm install
   npm run create-user -- --email you@company.com --password "a-strong-password" --name "Your Name"
   ```
   using the same `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   from Step 4, placed in a `.env.local` file or exported as environment
   variables in that shell session first.
3. This only needs to run once per new team member. It talks directly to
   Supabase, not to Vercel, so it works regardless of where you run it.

**If you'd rather avoid any shell at all:** you can create the user directly
in Supabase's dashboard — **Authentication → Users → Add user** — entering
an email and password and checking "Auto confirm user." This does exactly
what the script does, just through Supabase's own UI. The app's
`on_auth_user_created` trigger automatically creates the matching profile
row either way.

## Step 8 — Log in

Visit your Vercel URL, sign in with the account from Step 7. You're in.

---

## Migrating to your own VPS later

Nothing above is Vercel-specific except *where* the Next.js server runs.
When you're ready:

1. `npm run build` produces a `.next/standalone` folder — a self-contained
   Node.js server.
2. Copy that output (plus `.next/static` and `public/`) to your VPS, set
   the same environment variables there, and run `node server.js`.
3. Supabase itself doesn't move — it keeps being the database and auth
   provider regardless of where the Next.js app runs, exactly as it does
   today on Vercel. Nothing in the codebase assumes it's running on
   Vercel's infrastructure.

## Troubleshooting

- **"Unauthorized" on every page after login** — double check
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are exactly
  right in Vercel's environment variables (a common mistake is a trailing
  slash on the URL).
- **AI requests fail with a 502** — check `KIMI_API_KEY` is set and valid,
  and that `KIMI_API_BASE_URL` doesn't have a trailing slash.
- **Migration errors on re-run** — the schema is written to be safely
  re-run (`if not exists`), but if you changed something manually in
  Supabase's table editor first, resolve that drift before re-running.
