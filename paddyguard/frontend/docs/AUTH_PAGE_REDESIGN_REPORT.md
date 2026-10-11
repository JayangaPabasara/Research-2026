# PaddyGuard authentication page redesign

Implemented locally on 11 October 2026. No commit, push, deployment, backend change, API contract change, or environment variable change.

## Files and components

| File | Change |
| --- | --- |
| `src/components/auth/AuthSplitLayout.tsx` | Shared authentication layout with branding, global language selector, form card, desktop hero, and mobile introduction. |
| `src/components/auth/AuthLoginButton.tsx` | Login-only pill button, translated loading announcement, spinner, disabled state, and supplied icon. |
| `src/components/auth/AuthTranslationIcon.tsx` | Decorative CSS mask using the supplied transparent PNG. |
| `src/components/auth/auth.css` | Scoped responsive layout, image crops, gradients, focus rings, safe-area spacing, hover effects, image zoom, card entrance animation, and reduced-motion overrides. |
| `src/pages/Login.tsx` | Farmer and System Admin share the layout; role-specific headings; admin page omits the farmer registration prompt; staff and administrative navigation remain. |
| `src/pages/Register.tsx` | Shared layout, registration autocomplete, accessible server error association; registration validation and optional location flow retained. |
| `src/pages/StaffLogin.tsx` | Shared layout and login button; existing username authentication and expert/admin redirects retained. |
| `src/components/ui/Input.tsx` | Password toggle now has a 44px touch target, focus indicator, pressed state and input association; password text reserves space for the toggle. |
| `src/i18n/auth.ts`, `src/i18n/index.ts` | English/Sinhala authentication copy registered with the existing i18next instance. |
| `tests/render.test.mjs` | Two additional rendering tests for role-specific navigation and bilingual loading behavior. |
| `scripts/browser-auth.mjs`, `package.json` | Reproducible isolated Chromium checks via `npm run test:auth-browser`. |
| `docs/auth-screenshots/` | Six responsive screenshots. |

## Supplied assets

Both originals came from the user-provided `frontend/dist/assets` directory. Source assets now live in `public/assets/auth`, so builds retain them.

| Asset | Details |
| --- | --- |
| `bg-Image.webp` | Actual supplied rice-field photograph, resized to 1800 × 2030; 1,006,820 bytes, approximately 84% smaller than the 6,381,316-byte original. |
| `bg-Image.jpg` | Optimized JPEG fallback, same dimensions, quality 86; 1,068,761 bytes. |
| `language.png` | Supplied 512 × 512 PNG, 12,785 bytes. Inspected as 32-bit ARGB with a fully transparent corner. Its existing alpha channel is used as a CSS mask; color follows the surrounding text, including white in the login button. |

The background uses cover cropping, with a gradient overlay and WebP/JPEG `image-set` selection. The original full-resolution JPEG is not added to source assets. No external image fetching or new dependencies.

## Styling and accessibility

Desktop/tablet uses equal panels from 768px upward; mobile uses the photograph across the page behind an opaque foreground form card. Vertical scrolling remains available on short screens; no fixed-height form or overflow clipping. Safe-area padding is included.

The existing wheat icon, Inter font, and Noto Sans Sinhala font are retained. Agricultural green and cream are used throughout. Bright orange remains on decorative accents; the white-label login button uses a deeper orange with 19px bold text for contrast. Registration and unrelated buttons retain their existing shape.

Password controls preserve their existing visibility behavior. Form labels, autocomplete, server-error descriptions, live error announcements, visible keyboard focus, loading announcements, and touch targets are present. Global language changes continue setting the document language. Reduced-motion preference disables auth animations and transitions.

## Preserved authentication and language behavior

The existing submit handlers remain in the pages, including request payloads, duplicate-submit checks, token handling, profile fetches, active-user checks, role verification, logout on failures, leaf session initialization, and role-specific redirects. No authentication store, API client, protected route, or router configuration was changed.

System Admin login still rejects a FARMER and clears its temporary session. Valid SYSTEM_ADMIN authentication navigates to `/system-admin`; farmer authentication navigates to `/`. Existing Staff/Expert authentication and navigation are retained. The separate Pest Admin page remains unchanged.

Language controls reuse `LanguageSwitcher` and the global i18next instance. `paddyguard_language` remains the only language persistence key. Opening System Admin login does not force Sinhala. Existing profile-language behavior after successful authentication remains intact. Voice ASR behavior and backend payload names are unchanged.

## Verification

Checks run using the installed Node 22.23.3 executable because the default Node launcher has no active version configured.

| Check | Result |
| --- | --- |
| TypeScript: `tsc -b` | Passed. |
| Lint: `oxlint` | Passed, with eight existing warnings in unchanged files. |
| Unit/rendering suite: `node --test tests/*.test.mjs` | 39 passed, zero failed. |
| Production build: `vite build` | Passed. Existing large JavaScript chunk warnings remain. |
| Isolated Chromium: `node scripts/browser-auth.mjs` | Passed with intercepted synthetic APIs and no runtime exceptions. |

Browser coverage includes the login request's exact email/password payload, loading and disabled state, API error display and association, password visibility, Sinhala/English switching, persistence across reload/navigation, role-specific headings, missing registration link on System Admin login, farmer rejection on that page, successful farmer and System Admin redirects, registration autocomplete, staff heading, reduced-motion behavior, and short mobile scrolling.

Responsive checks at widths 360, 390, 768, 1024, 1440, and 1920 verify no horizontal overflow and the correct panel count. Desktop screenshots use a 900px viewport height and verify no unnecessary vertical scroll. A separate 360 × 420 viewport checks that the login button can be scrolled into view.

Screenshots: [360px](auth-screenshots/login-360.png), [390px](auth-screenshots/login-390.png), [768px](auth-screenshots/login-768.png), [1024px](auth-screenshots/login-1024.png), [1440px](auth-screenshots/login-1440.png), [1920px](auth-screenshots/login-1920.png).

## Verification limits

Browser authentication tests use intercepted API responses; they do not exercise a live backend or real credentials. Short viewport emulation checks available scrolling space, rather than a physical phone keyboard. Screenshots cover English farmer login; Sinhala switching and other auth pages are verified through browser and rendering checks. No Safari, Firefox, physical device, or manual screen-reader session was run. Existing application bundle size warnings and lint warnings were kept outside this frontend authentication scope.
