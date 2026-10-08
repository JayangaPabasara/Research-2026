# PaddyGuard Home redesign

The authenticated homepage remains `src/pages/Home.tsx`, inside the existing
AppShell. Styles are scoped beneath `.pg-home` in `src/pages/home.css`.
The only shared layout adjustments prevent flex overflow and respect reduced
motion in the existing page entrance transition.

## Data and navigation

Home still reads `useAuthStore` and `useDiagnosisStore`. Statistics count the
current user's saved Voice and Pest entries, not all backend diagnoses or Leaf
records. Most Recent Disease is the latest Voice record; Last Diagnosis is the
latest saved Voice or Pest record. Empty history displays explicit empty labels.
The existing store initializes synchronously from localStorage and exposes no
network loading/error state; Home adds no requests, loading claims, or simulated
errors. The store's existing malformed-history recovery remains unchanged.

Links use `/voice`, `/leaf`, `/pest`, `/chat`, and `/history`. Authentication,
sidebar, account menu, logout, API clients, environment contracts (`VITE_API_URL`,
`VITE_API_BASE_URL`, `VITE_PEST_API_URL`), Vite settings, and Vercel rewrites are
unchanged. The architecture diagram is explicitly conceptual research, rather
than a claim that every module is automatically integrated and validated.

## Rice illustration

`src/components/home/RiceVisual.tsx` renders an inline SVG immediately, then
lazy-loads `RiceScene.tsx` only on eligible desktop devices. The model is original
procedural geometry: curved stems, tapered leaf ribbons, and low-poly grains.
No external models, textures, videos, or model licenses are needed.

Three.js and React Three Fiber render the scene; Drei supplies 18 sparkles.
The scene uses ordinary lighting, no shadows or post-processing, and DPR capped
at 1.35. Wind and small pointer-based sway update outside React renders.
The SVG remains available under the scene for load errors or rendering failure.
An error boundary and context-loss handler protect the rest of the page.
Mobile screens below 900px, reduced-motion users, data-saver users, and devices
reporting fewer than four cores or less than 4GB memory use SVG. The scene
unmounts when outside the viewport or the document is hidden, and on route exit.
It does not access audio or alter Voice functionality.

## Manual review

- Sign in with a real account; verify the greeting and user-scoped saved records.
- Check empty history and Voice/Pest entries with different timestamps.
- Follow all feature links and History; record Voice audio and return Home.
- Check account menu, logout, and mobile sidebar at 360px, 768px, and desktop.
- Check Sinhala wrapping, keyboard focus, browser zoom, and screen reader order.
- Check desktop WebGL, context loss, reduced motion, and blocked scene chunk.
- Profile the demonstration laptop and a slower mobile network.

## Rollback

Before making further changes, the homepage-only tracked edits can be restored
with `git restore -- frontend/src/pages/Home.tsx frontend/package.json
frontend/package-lock.json frontend/src/components/layout/AppShell.tsx
frontend/src/components/layout/PageMotion.tsx` (run as one line). Remove the new
`frontend/src/components/home` directory, `frontend/src/pages/home.css`, and this
document, then run `npm ci`. This discards the redesign; save any subsequent
edits first. No backend, environment, or deployment rollback is required.

## Files and dependencies

Modified: `src/pages/Home.tsx`, `src/components/layout/AppShell.tsx`,
`src/components/layout/PageMotion.tsx`, `package.json`, `package-lock.json`.
Created: `src/pages/home.css`, `src/components/home/RiceVisual.tsx`,
`src/components/home/RiceScene.tsx`, and this document.

Added `three` 0.186.1, `@react-three/fiber` 9.8.1 (React 19 compatible),
`@react-three/drei` 10.7.9, and development-only `@types/three` 0.186.0.
Existing Framer Motion and Lucide are reused; no new animation or icon library.

## Validation performed

- `npm run build`: TypeScript project compilation and Vite production build passed.
  Vite reports chunks above 500kB; the scene is a separate lazy-loaded chunk
  (approximately 244kB gzip). No build configuration was changed to suppress warnings.
- `npm run lint`: completed successfully with seven warnings in unchanged files.
- Temporary Playwright checks using local Chromium passed: authenticated greeting,
  isolation of another user's records, sorting of recent records, empty history,
  feature link destinations, desktop canvas rendering, offscreen cleanup,
  context-loss fallback, unavailable WebGL, Voice navigation and scene teardown,
  unauthenticated redirect, reduced-motion SVG, mobile sidebar navigation, and no
  horizontal overflow at 360/768/1024/1440px. Desktop/mobile screenshots were reviewed.
  These used isolated browser storage fixtures and blocked external requests;
  they did not validate live API responses or real microphone recording.
- The frontend has no existing test script. No backend tests were run or altered.
- Dependency installation reported nine audit findings (two moderate, seven high).
  No automatic audit fixes or unrelated dependency upgrades were applied.

Nothing was deployed, committed, or pushed. The real-account and microphone
checks above remain manual before the research demonstration.
