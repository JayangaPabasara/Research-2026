import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import * as jsx from 'react/jsx-runtime'

const require = createRequire(import.meta.url)
const source = name => fs.readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')
function storage() {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
function loader(overrides = {}, globals = {}) {
  const cache = new Map()
  function load(name) {
    if (name in overrides) return overrides[name]
    if (cache.has(name)) return cache.get(name)
    const module = { exports: {} }
    cache.set(name, module.exports)
    const code = ts.transpileModule(source(name).replace(/import\.meta\.env/g, '({})'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { module, exports: module.exports, require: specifier => {
      if (specifier in overrides) return overrides[specifier]
      if (specifier.startsWith('@/')) return load(resolve(specifier.slice(2)))
      if (specifier.startsWith('.')) return load(resolve(path.posix.join(path.posix.dirname(name), specifier)))
      return require(specifier)
    }, crypto: globalThis.crypto, console, AbortController, URL, Blob, File, FormData, setTimeout, clearTimeout, setInterval, clearInterval, ...globals })
    cache.set(name, module.exports)
    return module.exports
  }
  function resolve(name) { return ['.ts', '.tsx', '/index.ts', ''].map(ext => name + ext).find(candidate => fs.existsSync(new URL(`../src/${candidate}`, import.meta.url))) }
  return load
}

function setup() {
  const localStorage = storage()
  const i18n = { language: 'en', t: key => key }
  const load = loader({ '@/i18n': i18n }, { localStorage, window: {} })
  return { load, localStorage, i18n }
}

test('Leaf/Pest handoffs generate Sinhala questions, distinct intentional IDs and detection metadata', () => {
  const { load } = setup()
  const { createTreatmentHandoff, canTreatLeaf, canTreatPest } = load('lib/treatmentHandoff.ts')
  const leaf = createTreatmentHandoff('Rice_Brown_Spot', 'disease')
  const pest = createTreatmentHandoff('Brown_Planthopper', 'pest')
  assert.equal(leaf.source, 'detection')
  assert.equal(leaf.detectionType, 'disease')
  assert.equal(leaf.initialTopic, 'Rice_Brown_Spot')
  assert.match(leaf.initialMessage, /දුඹුරු පුල්ලි රෝගය \(Brown Spot\) තියෙනවා/)
  assert.match(pest.initialMessage, /දුඹුරු මකුණා \(Brown Planthopper\) ඉන්නවා/)
  assert.equal(pest.detectionType, 'pest')
  assert.notEqual(leaf.handoffId, createTreatmentHandoff('Rice_Brown_Spot', 'disease').handoffId)
  for (const [name, status] of [['Healthy', 'OK'], ['healthy', 'OK'], ['Brown Spot', 'OOD'], ['', 'OK'], ['Unknown', 'OK']]) assert.equal(canTreatLeaf(name, status), false)
  assert.equal(canTreatLeaf('Brown Spot', 'OK'), true)
  const known = { prediction: 'Rice Hispa', status: 'known', source: 'fine_tuned', quality: { passed: true } }
  assert.equal(canTreatPest(known), true)
  assert.equal(canTreatPest({ ...known, status: 'maybe', source: 'few_shot' }), true)
  assert.equal(canTreatPest({ ...known, quality: { passed: false } }), false)
  assert.equal(canTreatPest({ ...known, status: 'unknown' }), false)
  assert.equal(canTreatPest({ ...known, source: 'ood' }), false)
  assert.equal(canTreatPest({ ...known, source: 'quality_check' }), false)
})

test('local Sinhala topic questions match the existing backend scope despite name differences', () => {
  const { load } = setup()
  const { LOCAL_TAXONOMY } = load('lib/taxonomy.ts')
  const { formatInitialAdvisorMessage } = load('lib/disease.ts')
  const { keywordScopeHit } = require('../../treatment_advisory_chatbot/data/diseasesPests.js')
  for (const topic of LOCAL_TAXONOMY) {
    const message = formatInitialAdvisorMessage(topic.canonical, 'si')
    assert.ok(keywordScopeHit(message), `${topic.english} must be recognized by the current backend`)
    assert.match(message, /මගේ වී වගාවේ/)
  }
})

test('taxonomy uses normalized local aliases and never makes a metadata request', async () => {
  let requests = 0
  const load = loader({ './api': { get: async () => { requests++; return { data: { topics: ['Brown Spot'] } } } } })
  const api = load('lib/chatApi.ts')
  const taxonomy = await api.getChatTaxonomy()
  assert.equal(api.resolveTaxonomyToSinhala('BPH', taxonomy), 'දුඹුරු මකුණා')
  assert.equal(api.resolveTaxonomyToSinhala('Rice_Leaf_Blast', taxonomy), 'තලා රෝගය')
  assert.equal(api.resolveTaxonomyToSinhala('Novel_Class', taxonomy), 'Novel Class')
  assert.equal(api.CHAT_TAXONOMY_METADATA.backendMetadataAvailable, false)
  await api.getChatTaxonomy()
  assert.equal(requests, 0)
  assert.deepEqual(Array.from(await api.getChatTopics()), ['Brown Spot'])
  assert.equal(requests, 1)
})

test('chat restores user sessions and original IDs; handoffs and concurrent sends are claimed once', () => {
  const { load, localStorage } = setup()
  const store = load('store/chatStore.ts').useChatStore
  let state = store.getState()
  state.ensureSession('alice')
  const original = store.getState().sessions.alice.sessionId
  state.addMessage('alice', { role: 'user', content: 'Existing question' })
  state.updateSessionPreferences('alice', { conversationLanguage: 'si', microphoneLanguage: 'en-US' })
  state.ensureSession('alice')
  assert.equal(store.getState().sessions.alice.sessionId, original)
  state.ensureSession('bob')
  assert.equal(store.getState().sessions.bob.messages.length, 0)
  assert.equal(state.claimHandoff('alice', 'handoff-one'), true)
  state.startNewSession('alice')
  assert.equal(state.claimHandoff('alice', 'handoff-one'), false)
  assert.equal(state.beginRequest(original), true)
  assert.equal(state.beginRequest(original), false)
  state.endRequest(original)
  assert.equal(state.beginRequest(original), true)
  state.endRequest(original)
  const archived = store.getState().history.alice[0]
  state.continueSession('alice', archived)
  assert.equal(store.getState().sessions.alice.sessionId, original)
  assert.equal(store.getState().sessions.alice.conversationLanguage, 'si')
  assert.equal(store.getState().sessions.alice.microphoneLanguage, 'en-US')
  const reloaded = loader({}, { localStorage, window: {} })('store/chatStore.ts').useChatStore
  assert.equal(reloaded.getState().sessions.alice.sessionId, original)
  assert.equal(reloaded.getState().sessions.alice.messages[0].content, 'Existing question')
  assert.equal(reloaded.getState().claimHandoff('alice', 'handoff-one'), false)
  state.resetSession('alice')
  assert.notEqual(store.getState().sessions.alice.sessionId, original)
  assert.equal(store.getState().history.alice[0].sessionId, original)
  assert.equal(store.getState().sessions.bob.messages.length, 0)
})

test('backend context recovery requires an explicit expiry response, never assumes context exists', () => {
  const { isExpiredChatSession } = loader()('lib/chatRecovery.ts')
  assert.equal(isExpiredChatSession({ response: { status: 410 } }), true)
  assert.equal(isExpiredChatSession({ response: { status: 404, data: { detail: 'Session not found' } } }), true)
  assert.equal(isExpiredChatSession({ response: { status: 404, data: { detail: 'Route not found' } } }), false)
  assert.equal(isExpiredChatSession({ response: { status: 503 } }), false)
  assert.equal(isExpiredChatSession(new Error('network')), false)
})

const diagnosis = { disease: 'Brown Spot', label_id: 1, confidence: 0.75, is_ood: false, ood_reason: null, needs_followup: true, status: 'followup', message: null, all_scores: { 'Brown Spot': 0.75 }, session_id: 'voice-one', sinhala_transcript: 'කොළ වල පුල්ලි', english_translation: 'Spots on leaves', followup_question: 'ප්‍රශ්නය', followup_question_en: 'Question', confidence_trajectory: [{ step: 1, confidence: 0.75, disease: 'Brown Spot', label: 'Initial' }], question_number: 1, max_questions: 3 }

test('voice workspaces persist transcripts, scores, follow-ups and trajectory per farmer without audio or credentials', () => {
  const { load, localStorage } = setup()
  const { useVoiceWorkspaceStore: store } = load('store/voiceWorkspaceStore.ts')
  store.getState().saveWorkspace('alice', { ...diagnosis, tts_audio_b64: 'audio', question_tts_b64: 'question-audio', raw_audio: 'private', accessToken: 'secret' })
  store.getState().saveWorkspace('bob', { ...diagnosis, disease: 'Leaf Blast' })
  const raw = localStorage.getItem('paddyguard_voice_workspaces')
  assert.doesNotMatch(raw, /tts_audio|question_tts|raw_audio|accessToken|secret/)
  const restored = loader({}, { localStorage, window: {} })('store/voiceWorkspaceStore.ts').useVoiceWorkspaceStore
  assert.equal(restored.getState().workspaces.alice.session_id, 'voice-one')
  assert.equal(restored.getState().workspaces.alice.sinhala_transcript, diagnosis.sinhala_transcript)
  assert.equal(restored.getState().workspaces.alice.confidence_trajectory[0].confidence, 0.75)
  assert.equal(restored.getState().workspaces.alice.needs_followup, true)
  restored.getState().clearWorkspace('alice')
  assert.equal(restored.getState().workspaces.alice, undefined)
  assert.equal(restored.getState().workspaces.bob.disease, 'Leaf Blast')
})

// Small deterministic hook host: exercises the actual page effects and callbacks.
function hooks() {
  const slots = [], effects = []
  let cursor = 0, queued = []
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }] },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial } },
    useCallback(callback) { cursor++; return callback },
    useEffect(callback, deps) { const index = cursor++; const prior = effects[index]; if (!prior || !deps || deps.some((value, i) => !Object.is(value, prior.deps?.[i]))) { queued.push(() => { prior?.cleanup?.(); effects[index] = { deps, callback, cleanup: callback() } }) } },
  }
  return { react, render(component) { cursor = 0; return component() }, flush() { const jobs = queued; queued = []; jobs.forEach(job => job()) }, repeatEffects() { effects.forEach(effect => effect?.callback()) }, unmount() { effects.forEach(effect => effect?.cleanup?.()) } }
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined
  if (predicate(tree)) return tree
  for (const child of [tree.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result }
}

function chatPage({ state = null, saved = false, response } = {}) {
  const { load, localStorage, i18n } = setup()
  const store = load('store/chatStore.ts').useChatStore
  store.getState().ensureSession('alice')
  if (saved) store.getState().addMessage('alice', { role: 'assistant', content: 'Original English advice', language: 'en' })
  const host = hooks(), requests = [], navigations = []
  const useStore = selector => selector(store.getState())
  useStore.getState = store.getState
  const topicApi = load('lib/chatApi.ts')
  const overrides = {
    react: host.react, 'react/jsx-runtime': jsx,
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n }) },
    'react-router-dom': { useLocation: () => ({ state, key: 'navigation-one', pathname: '/chat' }), useNavigate: () => (...args) => navigations.push(args) },
    'lucide-react': Object.fromEntries(['Clock', 'MessageCircle', 'Play', 'RotateCcw', 'Sprout', 'Volume2', 'VolumeX'].map(name => [name, name])),
    'react-hot-toast': { error() {}, success() {} },
    '@/i18n/text': { uiText: value => value }, '@/lib/disease': load('lib/disease.ts'),
    '@/lib/taxonomy': load('lib/taxonomy.ts'), '@/lib/chatRecovery': load('lib/chatRecovery.ts'),
    '@/lib/markdownLite': { stripLiteMarkdown: value => value },
    '@/store/chatStore': { useChatStore: useStore }, '@/store/authStore': { useAuthStore: selector => selector({ user: { id: 'alice' } }) },
    '@/hooks/useSpeechRecognition': { useSpeechRecognition: () => ({ supported: true, listening: false, start() {}, stop() {} }) },
    '@/hooks/useSpeechSynthesis': { useSpeechSynthesis: () => ({ supported: false, stop() {}, speak() {}, hasNativeVoice: () => false }) },
    '@/lib/chatApi': { ...topicApi, getChatTopics: async () => ['Brown Spot'], sendChatMessage: async (message, id) => { requests.push({ message, id }); return response ? await response() : { reply: 'Original advice', language: 'en', in_scope: true, chemicals: [], follow_up_question: null } } },
  }
  for (const name of ['ui/Button', 'ui/Card', 'ui/Badge', 'ui/Modal', 'ui/EmptyState', 'ui/ConfirmDialog', 'chat/ChatBubble', 'chat/ChatComposer', 'chat/TopicChips', 'chat/TypingIndicator']) overrides[`@/components/${name}`] = name
  const page = loader(overrides, { localStorage, window: { matchMedia: () => ({ matches: true }) } })('pages/TreatmentChat.tsx').default
  return { host, page, store, requests, navigations, i18n }
}

test('Treatment detection effect sends exactly once under repeated effects and sets Sinhala mic without changing UI language', async () => {
  const context = chatPage({ state: { source: 'detection', initialTopic: 'Brown Spot', detectionType: 'disease', handoffId: 'intent-one' } })
  context.host.render(context.page)
  context.host.flush()
  context.host.repeatEffects()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(context.requests.length, 1)
  assert.match(context.requests[0].message, /දුඹුරු පුල්ලි/)
  assert.equal(context.i18n.language, 'en')
  const tree = context.host.render(context.page)
  assert.equal(find(tree, node => node.type === 'chat/ChatComposer').props.micLang, 'si-LK')
  assert.equal(context.store.getState().sessions.alice.messages.length, 2)
  assert.equal(context.navigations[0][1].replace, true)
})

test('Treatment returns preserve transcript and session; UI language, conversation selection and tabs do not reset it', async () => {
  const context = chatPage({ saved: true })
  const before = context.store.getState().sessions.alice.sessionId
  context.host.render(context.page); context.host.flush()
  let tree = context.host.render(context.page)
  assert.ok(find(tree, node => node.props?.role === 'status'))
  find(tree, node => node.type === 'select').props.onChange({ target: { value: 'si' } })
  context.i18n.language = 'si'
  tree = context.host.render(context.page); context.host.flush()
  const tabs = []
  const collect = node => { if (!node || typeof node !== 'object') return; if (node.props?.role === 'tab') tabs.push(node); for (const child of [node.props?.children].flat(Infinity)) collect(child) }
  collect(tree)
  tabs[1].props.onClick(); context.host.render(context.page)
  tabs[0].props.onClick(); context.host.render(context.page)
  assert.equal(context.store.getState().sessions.alice.sessionId, before)
  assert.equal(context.store.getState().sessions.alice.messages[0].content, 'Original English advice')
  assert.equal(context.requests.length, 0)
  assert.equal(context.store.getState().history.alice, undefined)
})

test('expired Treatment session shows recovery without fabricated assistant reply or replay', async () => {
  const context = chatPage({ state: { source: 'detection', initialTopic: 'Brown Spot', handoffId: 'expiry' }, response: () => { throw { response: { status: 410 } } } })
  context.host.render(context.page); context.host.flush()
  await new Promise(resolve => setTimeout(resolve, 0))
  const tree = context.host.render(context.page)
  const status = find(tree, node => node.props?.role === 'status')
  assert.equal(find(status, node => node.type === 'p').props.children, 'expiredChatHelp')
  assert.equal(context.store.getState().sessions.alice.messages.length, 1)
  assert.equal(context.requests.length, 1)
  assert.equal(find(tree, node => node.type === 'chat/ChatComposer').props.disabled, true)
})

test('active handoff integrations, Sparkles route, responsive styles and reduced motion remain wired', () => {
  for (const name of ['pages/LeafDisease.tsx', 'components/leaf/ResultCard.tsx']) {
    assert.match(source(name), /canTreatLeaf\(/)
    assert.match(source(name), /state: createTreatmentHandoff\(/)
  }
  assert.match(source('components/pest/PestResult.tsx'), /canTreatPest\(result\)/)
  assert.match(source('components/layout/Sidebar.tsx'), /to: '\/chat',[\s\S]*?icon: Sparkles/)
  assert.match(source('index.css'), /prefers-reduced-motion: reduce/)
  assert.match(source('index.css'), /max-width: 480px/)
  assert.match(source('components/chat/ChatComposer.tsx'), /min-w-0/)
  assert.match(source('pages/History.tsx'), /<ActivityTable \/>/)
  assert.doesNotMatch(source('pages/History.tsx'), /admin\/activity|<ActivityTable admin/)
  for (const filename of ['lib/disease.ts', 'pages/TreatmentChat.tsx', 'i18n/index.ts']) assert.doesNotMatch(source(filename), /paddyguard_app_lang/)
})

function voicePage() {
  const { load, localStorage, i18n } = setup()
  const store = load('store/voiceWorkspaceStore.ts').useVoiceWorkspaceStore
  store.getState().saveWorkspace('alice', diagnosis)
  store.getState().saveWorkspace('bob', { ...diagnosis, disease: 'Leaf Blast' })
  const host = hooks(), requests = [], history = []
  let cancels = 0, finish
  const overrides = {
    react: host.react, 'react/jsx-runtime': jsx,
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n }) },
    'react-hot-toast': { error() {} }, '@/i18n/text': { uiText: value => value },
    'lucide-react': Object.fromEntries(['Mic', 'Square', 'UploadCloud', 'Sparkles', 'History', 'Trash2'].map(name => [name, name])),
    '@/store/authStore': { useAuthStore: selector => selector({ user: { id: 'alice' } }) },
    '@/store/voiceWorkspaceStore': { useVoiceWorkspaceStore: store },
    '@/store/diagnosisStore': { useDiagnosisStore: selector => selector({ voiceHistory: history, addVoiceEntry: entry => history.push(entry), deleteVoiceEntry() {} }) },
    '@/lib/disease': load('lib/disease.ts'),
    '@/lib/audioPlayer': { registerAudio() {}, stopAllAudio() {} },
    '@/hooks/useAudioRecorder': { useAudioRecorder: () => ({ cancel() { cancels++ }, start: async () => {}, stop: async () => null }) },
    '@/lib/voiceApi': { diagnoseVoice: async () => diagnosis, submitFollowUp: async (answer, session, signal) => { requests.push({ answer, session, signal }); return await new Promise(resolve => { finish = resolve }) } },
  }
  for (const name of ['ui/Card', 'ui/Button', 'ui/LoadingSpinner', 'ui/EmptyState', 'ui/ConfirmDialog', 'voice/DiagnosisResult', 'voice/FollowUpDialog', 'voice/OODWarning']) overrides[`@/components/${name}`] = name
  const page = loader(overrides, { localStorage })('pages/VoiceDiagnosis.tsx').default
  return { host, page, store, requests, history, i18n, complete: data => finish(data), cancels: () => cancels }
}

test('Voice restores follow-up workspace; confirmed New Diagnosis aborts requests and ignores delayed responses', async () => {
  const context = voicePage()
  let tree = context.host.render(context.page); context.host.flush()
  const dialog = find(tree, node => node.type === 'voice/FollowUpDialog')
  assert.equal(dialog.props.question, diagnosis.followup_question)
  const pending = dialog.props.onAnswer('ඔව්')
  assert.equal(context.requests[0].session, 'voice-one')
  assert.equal(context.requests[0].answer, 'ඔව්')
  context.i18n.language = 'si'
  tree = context.host.render(context.page)
  find(tree, node => node.type === 'ui/Button' && node.props.children === 'newDiagnosis').props.onClick()
  tree = context.host.render(context.page)
  const confirmation = find(tree, node => node.type === 'ui/ConfirmDialog')
  assert.equal(confirmation.props.isOpen, true)
  assert.ok(context.store.getState().workspaces.alice)
  confirmation.props.onConfirm()
  assert.equal(context.requests[0].signal.aborted, true)
  assert.equal(context.cancels(), 1)
  context.complete({ ...diagnosis, needs_followup: false })
  await pending
  assert.equal(context.store.getState().workspaces.alice, undefined)
  assert.equal(context.store.getState().workspaces.bob.disease, 'Leaf Blast')
  assert.equal(context.history.length, 0)
  tree = context.host.render(context.page)
  assert.equal(find(tree, node => node.type === 'voice/FollowUpDialog'), undefined)
  assert.equal(find(tree, node => node.type === 'voice/DiagnosisResult'), undefined)
})

test('Voice unmount aborts pending follow-up without replacing saved workspace or permanent history', async () => {
  const context = voicePage()
  const tree = context.host.render(context.page); context.host.flush()
  const pending = find(tree, node => node.type === 'voice/FollowUpDialog').props.onAnswer('නෑ')
  context.host.unmount()
  assert.equal(context.requests[0].signal.aborted, true)
  context.complete({ ...diagnosis, needs_followup: false, confidence: 0.99 })
  await pending
  assert.equal(context.store.getState().workspaces.alice.confidence, 0.75)
  assert.equal(context.history.length, 0)
})

test('recorder cancellation releases permission-delayed streams without starting recording', async () => {
  const host = hooks()
  let resolvePermission, stops = 0, starts = 0
  class Recorder { static isTypeSupported() { return true }; start() { starts++ } }
  const load = loader({ react: host.react, '@/i18n/text': { uiText: value => value } }, { navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { resolvePermission = resolve }) } }, MediaRecorder: Recorder })
  const hook = load('hooks/useAudioRecorder.ts').useAudioRecorder
  const recorder = host.render(hook); host.flush()
  const pending = recorder.start()
  recorder.cancel()
  resolvePermission({ getTracks: () => [{ stop() { stops++ } }] })
  await pending
  assert.equal(starts, 0)
  assert.equal(stops, 1)
})

test('Treatment and Voice APIs retain payload contracts and pass abort signals', async () => {
  const calls = []
  const api = { post: async (...args) => { calls.push(args); return { data: { reply: 'English advice' } } }, delete: async (...args) => { calls.push(args) } }
  const load = loader({ './api': api })
  const chat = load('lib/chatApi.ts'), voice = load('lib/voiceApi.ts')
  const signal = new AbortController().signal
  const response = await chat.sendChatMessage('Question', 'original-id', signal)
  assert.equal(response.reply, 'English advice')
  assert.equal(calls[0][0], '/api/v1/chat/message')
  assert.equal(calls[0][1].session_id, 'original-id')
  assert.equal(calls[0][2].signal, signal)
  assert.equal(Object.keys(calls[0][1]).length, 2)
  await voice.submitFollowUp('ඔව්', 'voice-one', signal)
  assert.equal(calls[1][0], '/api/v1/voice/followup')
  assert.equal(calls[1][1].answer, 'ඔව්')
  assert.equal(calls[1][2].signal, signal)
  await voice.diagnoseVoice(new Blob(['audio']), 'sample.webm', signal)
  assert.equal(calls[2][0], '/api/v1/voice/diagnose')
  assert.ok(calls[2][1].has('audio'))
  assert.equal(calls[2][2].signal, signal)
  await chat.clearChatSession('original-id')
  assert.equal(calls[3][0], '/api/v1/chat/session/original-id')
})
