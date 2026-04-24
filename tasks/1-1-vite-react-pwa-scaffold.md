# Task 1-1 — Vite + React + TypeScript PWA Scaffold

## Goal
Stand up an empty but installable PWA at `d:\planta\` using Vite + React + TypeScript + Tailwind + `vite-plugin-pwa`. The app should be installable on Android Chrome and "Add to Home Screen"-able on iOS Safari, with offline asset caching working via Workbox.

## Scope
Foundation only. No domain logic, no DB, no real screens — just a single placeholder Home route showing "Planta" and proof that:
- Dev server runs (`npm run dev`)
- Build succeeds (`npm run build`) and produces a service worker + manifest
- Production preview is installable (`npm run preview`)

## Files to create
- `package.json` — deps: `react`, `react-dom`, `react-router-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `vite-plugin-pwa`, `workbox-window`, `tailwindcss`, `postcss`, `autoprefixer`
- `vite.config.ts` — React + PWA plugin (autoUpdate, manifest inline, runtime caching for app shell)
- `tsconfig.json`, `tsconfig.node.json` — strict mode
- `tailwind.config.ts`, `postcss.config.js` — Tailwind theme stub (full tokens come in 1-2)
- `index.html` — viewport-fit, theme-color, apple-touch-icon, apple-mobile-web-app-capable
- `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon-180.png` — placeholder green-square icons (regenerate later)
- `public/manifest.webmanifest` — name "Planta", short_name "Planta", theme_color `#2D6A4F`, background_color `#F8F9F3`, display `standalone`, start_url `/`, icons
- `src/main.tsx`, `src/App.tsx`, `src/index.css` (Tailwind directives), `src/registerSW.ts`
- `.gitignore`, `README.md` (one-paragraph dev instructions)

## Acceptance criteria
- `npm install` succeeds without warnings about peer deps.
- `npm run dev` opens a page showing "Planta" header.
- `npm run build` emits `dist/sw.js` and `dist/manifest.webmanifest`.
- Lighthouse PWA audit on `npm run preview` shows the Install prompt criteria met (manifest, SW, HTTPS-or-localhost, icons).
- Loading the app once then going offline (DevTools → Network → Offline) and reloading still shows the page.

## Out of scope (later tasks)
- Theme tokens / design system (1-2)
- Routing beyond a single placeholder page (added incrementally as features land)
- Real icons (replace placeholders later when we have a logo)
