# PaddyGuard frontend deployment checklist

No commit, push, deployment, production data mutation or backend change was performed for this frontend implementation.

## Configuration

- Vercel project root: `frontend`; framework: Vite; Node: 22.x.
- Install: `npm ci`; build: `npm run build`; output: `dist`.
- Required checks: `npm run lint`, `npm test`, `npm run build`.
- Keep `frontend/vercel.json` SPA rewrites so direct visits to `/profile`, `/feedback`, `/system-admin-login` and `/system-admin` work.
- `VITE_API_URL`: public Gateway base URL, `https://gateway-production-3c64.up.railway.app`. Used for primary authentication, profile, feedback, testimonials, activity, System Admin, Voice, Treatment and Pest inference.
- `VITE_API_BASE_URL`: preserve existing Leaf API base URL semantics. Inspect the existing project's value; do not append a second `/api/v1/image` prefix. Leaf staff authentication/history still use this existing client.
- `VITE_PEST_API_URL`: preserve existing Pest staff/learned-class service configuration. Pest inference now uses the primary Gateway; training and staff routes retain their original configuration.
- Vite environment values are public. Do not add administrator passwords, bootstrap credentials, database URLs, JWT signing keys or internal service credentials.
- Keep the production domains unchanged.

## Backend readiness

- Follow the separate backend deployment guide before testing the new features. The supplied contract describes locally implemented backend changes whose production deployment was pending.
- Verify PostgreSQL migration, active FARMER identities and manually provisioned SYSTEM_ADMIN identity.
- Verify MongoDB availability for avatar, feedback, testimonials, overview counts and activity. A 503 must display an error, never fabricated zero counts or success.
- Ensure Gateway proxies match `FRONTEND_INTEGRATION_CONTRACT.md`. Do not expose private User Management URLs to the browser.
- Named testimonials, other users' avatar retrieval, failure/pending activity statuses and client-submitted activity records are not implemented by the backend and are not synthesized here.

## Expected Gateway routes

| Method | Route | Use |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Farmer registration |
| POST | `/api/v1/auth/login` | Farmer and System Admin login |
| POST | `/api/v1/auth/refresh` | Refresh-token exchange |
| GET, PATCH | `/api/v1/users/me` | Authoritative identity and editable profile fields |
| GET, POST, DELETE | `/api/v1/users/me/avatar` | Authenticated JPEG retrieval, multipart `avatar`, removal |
| POST | `/api/v1/feedback` | Farmer feedback submission |
| GET | `/api/v1/feedback/mine` | Own paginated feedback |
| GET | `/api/v1/testimonials` | Public anonymous approved testimonials |
| GET | `/api/v1/activity/me` | Own activity |
| GET | `/api/v1/admin/overview` | System Admin totals |
| GET | `/api/v1/admin/farmers` | Farmer search and pagination |
| GET | `/api/v1/admin/farmers/{user_id}` | Farmer details |
| GET | `/api/v1/admin/feedback` | Rating/category/status filters |
| PATCH | `/api/v1/admin/feedback/{feedback_id}` | Contract moderation transitions |
| DELETE | `/api/v1/admin/feedback/{feedback_id}?confirm={feedback_id}` | Confirmed permanent deletion |
| GET | `/api/v1/admin/activity` | Activity and farmer filters |
| POST | `/api/v1/voice/diagnose`, `/api/v1/voice/followup` | Existing Voice flows |
| POST | `/api/v1/pest/detect` | Pest inference through Gateway |
| POST | `/api/v1/chat/message` | Existing Treatment chat |
| GET | `/api/v1/chat/topics` | Existing topics |
| DELETE | `/api/v1/chat/session/{session_id}` | Existing chat reset |

Existing Leaf routes and Leaf/Pest staff routes remain in their separate existing clients. Leaf classification remains at `${VITE_API_BASE_URL}/api/v1/image/classify` and preserves its separate Leaf bearer token. The primary farmer and Leaf account systems are not reconciled by this frontend.

## Browser and authorization checks — pending live execution

- Use dedicated test accounts on a staging or operator-approved deployment. Do not use production farmer data for screenshots.
- Test farmer login, registration, logout, reload and expired access-token refresh. Ensure invalid login does not refresh an old session.
- Test the unchanged Staff/Expert and Pest Admin login flows.
- Test System Admin login with `/users/me` role verification. A farmer using the admin login must be rejected and cleared from the attempted session.
- Try direct `/system-admin` visits, forged localStorage roles, expired/inactive accounts and 401/403 responses. The backend must independently reject every unauthorized admin request.
- Confirm admin passwords are neither stored nor logged and farmer tokens are not sent to the separate Pest service.
- Inspect browser OPTIONS responses from the actual Vercel origin. Allow Authorization, Content-Type and X-Request-ID where needed, all required methods, and multipart requests with browser-generated boundaries.
- Check profile text editing, read-only email, optional field clearing, save/cancel, avatar preview, JPEG/PNG/WebP validation, 2 MiB limit, replacement, authenticated retrieval, 404 absence, removal and storage failure.
- Confirm header/sidebar avatar and name update without reload.
- Submit feedback with and without consent. Check persistence, 1–5 ratings, all contract categories, own history and pagination. Pending feedback must not appear publicly.
- Review positive consented feedback for identifying text before approval; verify anonymous public cards. Test reject, requeue, unpublish, approval eligibility, 409 conflicts, pagination and deletion confirmation.
- Search farmers, view safe details and filter their activity. Other users' avatars must not be fetched using the self-avatar URL.
- Verify own activity cannot select another user. Check timezone-aware since/until filters, event/module filters, pagination and completed-operation semantics.

## Existing AI regression checks — pending real inference

- Voice: record/upload Sinhala audio; verify diagnosis, OOD, follow-up completion, Sinhala yes/no payloads, speech playback and saved detailed history.
- Leaf: analyze a valid leaf image, OOD image, field details, weather, Grad-CAM, expert review, staff administration and retained detailed cases/history.
- Pest: test quality rejection, known/unknown pest, learned-class output, Grad-CAM, saved detailed history and separate Pest Admin training workflows. Verify Gateway activity when farmer identity is valid.
- Treatment: topics, typed message, Sinhala/English speech controls, session reset, continued conversations, dosage calculator and restored history.
- Check no fabricated diagnosis events; activity logs do not replace diagnosis results. Direct teammate service calls and the distinct Leaf token model can limit primary farmer activity capture.

## Language, layout and accessibility — pending browser execution

- Switch Sinhala/English on login, registration, farmer pages, every AI module and staff/admin pages. Check authenticated preference PATCH and restoration on login/reload; test failed preference saves.
- Confirm interface language does not change Sinhala Voice ASR or follow-up answer payloads. Backend enums and API fields remain unchanged.
- Review Sinhala terminology with a fluent speaker. Backend-authored free text and user-generated content remain in their original language.
- Test expanded/collapsed navigation at desktop/laptop sizes, persisted state, active links, tooltips and profile/logout access.
- Test the mobile drawer with keyboard focus, Escape, close button and reduced motion. Check widths 360, 768, 1024 and 1440 px, Sinhala wrapping, table scrolling and no horizontal page overflow.
- Verify Three.js hero lazy loading, WebGL fallback, resizing and frame rate. Its scene implementation remains unchanged.

## Current local validation

- `npm run build` was attempted; the installed NVM shim rejected npm execution with NVM4306 (untrusted delegated npm script).
- The same build stages ran through the installed Node executable: TypeScript project build and Vite production build passed. Build reports large bundle warnings.
- Oxlint ran through the installed Node executable with no errors; existing hook/typing warnings and a shared-component fast-refresh warning remain.
- `node --test tests/*.test.mjs` runs isolated Axios adapter tests and server-rendered React checks. These are not live backend integration tests or browser interaction tests.
- 19 local tests passed, covering contract payloads, moderation transitions, multipart avatars, error handling, refresh, cancellation, token isolation, Sinhala Voice answers, bilingual rendering, anonymous testimonials and history preservation.
- Production CORS, persisted data workflows, real authentication and real inference have not been tested by this task.

## Manual release and rollback

1. Review frontend changes and backend readiness; repair the local NVM installation using the machine administrator's normal procedure if npm remains blocked.
2. Run the checks above and deploy a Vercel preview using the existing project configuration, without changing production domains.
3. Perform all pending browser/backend checks on that preview with configured CORS.
4. Promote only after the operator approves the verified preview.
5. For rollback, use Vercel's deployment history to restore the previous known-good frontend deployment. Keep the existing environment values and domains. Backend rollback/migrations belong to the separate backend operator guide.
