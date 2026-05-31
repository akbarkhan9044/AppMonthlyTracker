# Atomic Tracker — Mobile (Expo)

A starter Expo app that talks to the **same Netlify backend** as the website
(`https://trackerakbar.netlify.app`). It demonstrates the shared-backend wiring:
the app reads coding stats and the AI summary from the same `/api/*` functions
the web app uses.

> Note: this connects to the same **backend**, but to-do **data** does not sync
> with the web yet — the website still stores to-dos in the browser's
> `localStorage`, which a phone can't read. Real cross-device sync needs a shared
> database (Supabase/Firebase). That's the next phase.

## Run it

```bash
cd mobile
npm install
npx expo start
```

Then:
- Press `i` for the iOS simulator, `a` for Android, or scan the QR code with the
  **Expo Go** app on your phone.

## Point it at a different backend

The base URL defaults to production. Override it with an Expo public env var:

```bash
EXPO_PUBLIC_API_BASE=https://your-site.netlify.app npx expo start
```

(Or change `extra.apiBase` in `app.json` / the fallback in `src/config.js`.)

## How secrets stay safe
The Anthropic and WakaTime API keys live **only** in Netlify env vars and are
read inside the serverless functions. The app never sees them — it just calls
the function URLs over HTTPS (CORS is enabled on those functions).
