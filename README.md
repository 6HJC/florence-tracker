# Florence Marathon Tracker

Hal Higdon Novice 2 training tracker with Strava integration — installable PWA.

---

## Deploy to the web (GitHub + Netlify)

### Step 1 — GitHub account
1. Go to **github.com** and create a free account if you haven't already.

### Step 2 — Create a new repository
1. Click the **+** icon (top right) → **New repository**
2. Name it: `florence-tracker`
3. Set it to **Public** (required for free Netlify)
4. **Do not** tick "Add README" — leave everything unchecked
5. Click **Create repository**

### Step 3 — Upload these files
1. On your new repo page, click **uploading an existing file**
2. Drag and drop ALL these files/folders:
   - `package.json`
   - `vite.config.js`
   - `index.html`
   - `netlify.toml`
   - `.gitignore`
   - The entire `src/` folder
   - The entire `public/` folder
3. Scroll down, click **Commit changes**

### Step 4 — Deploy on Netlify
1. Go to **netlify.com** → sign up free (use your GitHub account)
2. Click **Add new site** → **Import an existing project**
3. Choose **Deploy with GitHub** → authorise → select `florence-tracker`
4. Build settings (should auto-fill, but verify):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**
6. Wait ~60 seconds. You'll get a URL like `https://florence-tracker-abc123.netlify.app`

You can set a custom name: **Site configuration → Change site name** → e.g. `george-florence-tracker`

---

## Install on Android (Chrome)

1. Open Chrome on your Android phone/tablet
2. Go to your Netlify URL
3. Tap the **three-dot menu** (top right)
4. Tap **Add to Home screen**
5. Tap **Add**

It will appear as a full-screen app on your home screen with no browser bar.

---

## Connect Strava

The app walks you through this on first launch. In brief:

1. Create a Strava API app at strava.com/settings/api (free, any name, set callback domain to `localhost`)
2. Visit the OAuth URL shown in the app to get an auth code
3. Run the curl command shown to exchange it for an access token
4. Paste the token into the app — it remembers it in local storage

Tokens last ~6 hours. Use the ↻ button to refresh data.

---

## Updating the app later

If you want to make changes (e.g. update plan data, tweak colours):

1. Edit the file in GitHub directly (click the file → pencil icon)
2. Commit the change
3. Netlify auto-redeploys in ~30 seconds
