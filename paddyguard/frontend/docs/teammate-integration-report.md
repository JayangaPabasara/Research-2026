# PaddyGuard frontend integration report

Date: 11 October 2026 (Asia/Colombo).

The compatible additions from all five teammate files are integrated into the existing frontend. No backend services, API URLs, authentication protocols, commits, pushes or deployments were changed.

## 1. Modified and added files

All paths below are relative to `frontend/`.

| Modified files | Purpose |
| --- | --- |
| `src/lib/chatApi.ts`, `src/lib/disease.ts` | Local taxonomy access, aliases, healthy helper and Sinhala question formatting; existing methods and formatting retained. |
| `src/components/pest/PestResult.tsx` | Sinhala handoff, detection metadata, quality/OOD protection, translated status labels. |
| `src/components/leaf/ResultCard.tsx`, `src/pages/LeafDisease.tsx` | Treatment handoffs on both reusable and actual active Leaf interfaces; healthy/invalid/OOD exclusions. |
| `src/pages/TreatmentChat.tsx`, `src/store/chatStore.ts` | Restore current conversations, intentional handoffs, duplicate prevention, independent language preferences, truthful recovery and improved chat/history UI. |
| `src/components/chat/ChatBubble.tsx`, `src/components/chat/ChatComposer.tsx`, `src/components/chat/TopicChips.tsx`, `src/components/chat/TypingIndicator.tsx` | Localized controls, topic display/questions, accessible loading, composition-safe Enter handling and responsive message/composer layout. |
| `src/pages/VoiceDiagnosis.tsx`, `src/hooks/useAudioRecorder.ts`, `src/lib/voiceApi.ts` | Workspace restoration, confirmed reset, recording cancellation, abortable requests and stale-response guards. |
| `src/components/voice/DiagnosisResult.tsx`, `src/components/voice/FollowUpDialog.tsx` | Reduced-motion behavior; Voice results also use the protected Sinhala Treatment handoff. |
| `src/components/layout/Sidebar.tsx` | Sparkles icon for Treatment only. |
| `src/pages/History.tsx` | Explain activity events separately from detailed diagnosis records. |
| `src/App.tsx` | Key Treatment/Voice page instances to authenticated farmer identity. Language changes keep the same instance. |
| `src/i18n/index.ts`, `src/i18n/text.ts` | Integrate new UI translations with the existing i18next instance and language storage key. |
| `src/index.css` | Theme-consistent tabs, bubbles, composer, history cards, focus styles, mobile layout and reduced motion. |
| `src/components/ui/Modal.tsx` | Accessible shared confirmation dialogs, focus trapping/restoration, localized close control and reduced-motion transitions. |
| `tests/community.test.mjs`, `tests/render.test.mjs` | Existing API/auth regression checks plus global language and immutable-advice coverage. |
| `package.json` | Add an optional local `test:browser` script; no dependency changes. |

Added files:

- `src/lib/taxonomy.ts`: explicit local taxonomy reference from teammate names and aliases.
- `src/lib/treatmentHandoff.ts`: shared eligibility and handoff creation.
- `src/lib/chatRecovery.ts`: recognize explicit server session-expiry errors without probing or replaying.
- `src/store/voiceWorkspaceStore.ts`: user-scoped, whitelisted Voice workspace persistence.
- `src/i18n/enhancements.ts`: Sinhala/English interface text and supplemental source mappings.
- `tests/integration.test.mjs`: runtime store, page effect, cancellation and integration regressions.
- `scripts/browser-integration.mjs`: isolated Chromium QA with synthetic records and mocked APIs.
- `docs/teammate-integration-report.md`: this report.

## 2. Teammate integration matrix

| Teammate file | Result |
| --- | --- |
| `PestResult.tsx.txt` | Integrated Sinhala questions and source/type/topic/message metadata. Current richer quality, OOD, learned-class and Grad-CAM interface retained. |
| `chatApi.ts.txt` | Integrated `TaxonomyTopic`, `getChatTaxonomy`, and `resolveTaxonomyToSinhala`. Adapted to local data because the backend only returns `{ topics }`; no invented endpoint or metadata request. |
| `disease.ts.txt` | Integrated expanded aliases, pest terms/colors, `isHealthyDisease`, and Sinhala/English question formatting. Existing disease colors, severity thresholds, confidence and date helpers retained. No `paddyguard_app_lang` or second global language store. |
| `TreatmentChat.tsx.txt` | Integrated detection-aware initialization, Sinhala mic defaults, topic questions and duplicate protection. Replaced the teammate/current fresh-on-every-return behavior with current-session restoration. |
| `ResultCard.tsx.txt` | Added protected Treatment button to the reusable card and updated the actual active Leaf page. Healthy predictions cannot open Treatment from these controls. |

Local terms are frontend reference metadata supplied with the teammate files. They are not presented as backend-verified metadata. Unsupported names keep their cleaned original name; unknown metadata is not invented. New learned pest classes can be handed off when accepted by existing detection requirements, but chatbot coverage is still determined by the backend.

## 3. Features preserved

- Leaf classification, original result layout, Grad-CAM, weather, yield impact, expert review, case/history flows and separate Leaf service authentication.
- Pest image quality checks, OOD behavior, confidence/similarity, learned classes, model-source information, Grad-CAM and Gateway authentication.
- Treatment response Markdown, chemicals, dosage calculator, follow-up questions, microphone input, speech playback, archived History, Continue and original session IDs.
- Farmer profile language synchronization, authentication refresh, public/auth/admin routing and activity API separation.
- Voice Sinhala ASR and Sinhala follow-up answer payloads, scores, confidence trajectory and permanent diagnosis history.

## 4. New functionality

Detection buttons create fresh intentional handoffs with unique IDs, detection metadata and natural Sinhala treatment questions. Known local topics include their canonical English name in parentheses, because the teammate and backend use different Sinhala stem-borer terms. This preserves backend keyword recognition without replacing the Sinhala question. Accepted but uncertain Pest predictions retain their existing verification warnings; rejected/poor-quality/unknown/OOD detections do not expose Treatment controls.

Treatment restores the current local chat on return. New Chat and a new detection intent archive the existing conversation and create a new ID. Handoff claims are persisted, router state is cleared, and in-memory per-session request locks prevent overlapping or duplicate sends in the same app instance. Stale responses cannot append to a different active session. Failed requests remain UI errors rather than fabricated assistant replies.

Voice has an explicit New Diagnosis button. Active work requires confirmation. Confirming aborts pending requests, cancels recording (including permission-delayed streams), clears only the current farmer workspace and prevents delayed responses from repopulating it. Existing permanent diagnosis history is untouched.

The existing green/cream/orange theme now has clearer chat/history tabs, message typography, focus styles, composer controls and responsive history cards. Treatment alone uses the Sparkles sidebar icon.

## 5. Language-state architecture

| State | Owner and behavior |
| --- | --- |
| Global UI language | Existing i18next instance and `paddyguard_language`. Existing farmer preference synchronization remains. |
| Treatment question language | Current chat-session metadata. Controls generated topic questions; detection handoffs initialize it to Sinhala. It does not translate manually typed messages. |
| Treatment microphone language | Separate chat-session metadata, `si-LK` or `en-US`. Independently toggleable; detections initialize it to Sinhala. |
| Voice ASR language | Existing Sinhala backend contract. Independent of interface and Treatment settings. |
| Actual Treatment reply language | Backend detects Sinhala Unicode in the current message and prompts for a reply in that language. Request contract remains `{ message, session_id }`; there is no explicit language field. |

Changing the global UI language does not reset or translate saved conversations. Changing question language does not change microphone language; changing microphone language does not overwrite question language or global UI language. Existing advice, chemical names, recommended dosages and follow-up content remain exactly as received. Model compliance with the backend language prompt still depends on the backend/model.

Render tests cover Sinhala/English switching for Voice, Leaf, Pest, Treatment, History, Profile, Feedback, Login, Register and System Admin. The existing translated navigation and account preference synchronization are retained.

## 6. Voice persistence

`paddyguard_voice_workspaces` stores an object keyed by authenticated farmer ID in localStorage. A field whitelist includes the diagnosis, transcripts, scores/probabilities, confidence, follow-up question/state, session identifier, severity, trajectory and audio-quality metrics. Stage is derived from the saved result on return.

Raw recordings, generated TTS audio, tokens and credentials are excluded. Playback remains available for audio returned in the current page instance; restored workspaces intentionally do not contain saved audio. In-progress recordings/requests cannot be resumed after navigation; they are cancelled. A completed or follow-up workspace survives navigation/reload. Device storage denial falls back to in-memory workspace state.

The workspace is separate from permanent diagnosis history. Clearing it does not call history deletion APIs/actions or remove another farmer's workspace.

## 7. Treatment persistence

The existing `paddyguard_chat_sessions` and `paddyguard_chat_history` keys remain in use, keyed by farmer ID. Sessions now carry independent question/microphone preferences, handoff claims and explicit unavailable-context status. Archived conversations retain their original IDs and language preferences. Existing limits remain 200 messages and 50 archived conversations; handoff claims retain the most recent 100 IDs.

Ordinary return uses `ensureSession`, rather than starting a new conversation. New Chat creates a distinct session ID and preserves the archived server ID; it no longer deletes that archived session's server memory. `clearChatSession` remains available in the API library. Existing server memory can therefore continue when it still exists, but the frontend never claims that a local transcript restores it.

Restored chats show a notice that backend context cannot be verified. Explicit session-unavailable errors show recovery text, preserve the transcript, disable sending and offer New Chat. No historical messages are automatically replayed. Exactly-once guards cover route/effect repetition and concurrent sends in one app instance; cross-tab coordination and server-side idempotency are separate backend/browser concerns.

## 8. Backend limitations and separate work

- Treatment memory is an in-process Map and is lost on restart. A persistent, user-owned shared store and retention policy are needed for durable/multi-instance conversations.
- There is no session-validity endpoint. The current backend silently creates missing sessions and does not reliably emit expiry errors. Frontend recovery handles explicit errors if provided, while the restored-transcript notice explains the present detection limitation.
- A versioned taxonomy response with canonical/English/Sinhala names and aliases is needed for backend-verified metadata. Today the valid topics endpoint returns only strings.
- Explicit language control and stronger reply-language validation would require backend contract/model changes. No frontend agricultural translations are fabricated.
- Restored Voice follow-up IDs still depend on the existing Voice backend session lifetime. Frontend persistence does not extend backend lifetime.
- Live model inference, microphones and device Sinhala speech voices were not exercised by mocked browser QA. Those require a separate integrated-device/backend acceptance run.

No backend files were changed.

## 9. Validation

- Automated tests: **37 passed, 0 failed**.
- TypeScript: `tsc -b` passed.
- Lint: oxlint exited successfully with **8 existing warnings**, no errors. Warnings are in pre-existing Markdown, Leaf/History hooks, shared-component exports, speech declarations and the UI collection script.
- Production build: TypeScript and Vite passed. Vite reports large chunks (approximately 1.46 MB app and 0.92 MB RiceScene before gzip); bundle splitting is separate work.
- Isolated Chromium: Treatment/Voice checked at **390, 768 and 1440 px**, persisted sessions, unchanged received English advice after switching to Sinhala, reduced-motion styles and no horizontal page overflow. Authenticated Pest/Leaf/History/Profile/Feedback pages rendered with persisted Sinhala UI. A real React StrictMode detection route submitted exactly one POST and did not resend on return or force global Sinhala. New Diagnosis required confirmation before clearing its workspace. No runtime exceptions, automatic historical message replay or admin activity requests were observed.
- Farmer activity request used `/api/v1/activity/me`; admin route remains `/api/v1/admin/activity` through the existing admin-only flow.
- Source whitespace validation: `git diff --check` passed.

The local npm launcher rejected its delegated script with NVM4306. Checks were executed with the installed Node executable and the project binaries directly, rather than claiming `npm run` succeeded:

```text
node node_modules/oxlint/bin/oxlint
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
node scripts/browser-integration.mjs
```

Browser QA required sandbox approval to start isolated headless Chromium. Its synthetic account/API fixtures do not access real farmer records. With a trusted npm launcher the equivalent scripts are `npm run lint`, `npm test`, `npm run build`, and `npm run test:browser`.

## 10. Deployment readiness and rollback

The frontend builds and is ready for review and a controlled acceptance run against the existing services. Durable backend memory and verified taxonomy remain separate work; this frontend release does not promise them. Nothing was deployed.

For rollback, first preserve any unrelated work and review the frontend diff. Restore only the modified frontend files listed above from the pre-integration revision, and remove only the newly added files listed above if they are not wanted. Do not reset or clean the whole repository. Then repeat tests, TypeScript and build checks.

Chat/history keys and existing message shapes remain compatible; added session metadata is optional. The previous frontend can ignore it. The new Voice workspace key can be left in place for a future reinstall. If clearing it is desired, remove only the affected farmer's workspace entry after confirmation; preserve permanent diagnosis and Treatment history. No backend/database rollback is required.

## 11. Vercel environment variables

**No changes required.** Existing API and service URL variables are unchanged. `BROWSER_EXECUTABLE`, if needed, is an optional local QA override for a Chromium executable, not a Vercel runtime/build variable. No secrets or new service endpoints were added.
