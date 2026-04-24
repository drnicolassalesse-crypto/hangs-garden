# Hang's Garden

On-device plant care PWA. Android Chrome (primary) + iOS Safari "Add to Home Screen" (lighter experience). No backend, no accounts, no subscription.

See `planta-clone-spec.md` for the product spec and `tasks/` for the numbered implementation tasks.

## Dev

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (emits service worker + manifest)
npm run preview    # serve the built app locally for PWA testing
npm run typecheck
```

## Install on a phone

- **Android (Chrome):** open the site → you'll get a bottom-bar "Install Hang's Garden" prompt (or use the browser menu → Install app).
- **iOS (Safari 16.4+):** open the site → tap Share → **Add to Home Screen**. The app then runs fullscreen and persists data offline. Web Push reminders work only after installation, on iOS 16.4+.

## Stack

Vite · React 18 · TypeScript · Tailwind · Dexie (IndexedDB) · vite-plugin-pwa (injectManifest).
