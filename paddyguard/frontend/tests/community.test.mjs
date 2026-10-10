import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import axios from 'axios'
import { create } from 'zustand'
import * as jsxRuntime from 'react/jsx-runtime'

// Isolated client tests: no server, credentials, persistent records or production writes.
function load(relative, dependencies = {}, globals = {}) {
  const source = fs.readFileSync(new URL(`../src/${relative}`, import.meta.url), 'utf8').replace(/import\.meta\.env/g, '({VITE_API_URL: "https://gateway.test"})')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name] }, FormData, Blob, File, URL, crypto: globalThis.crypto, ...globals })
  return module.exports
}
function storage() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) } }
function setup() {
  const localStorage = storage(), sessionStorage = storage()
  const { useAuthStore } = load('store/authStore.ts', { zustand: { create } }, { localStorage, sessionStorage })
  const { default: api, getErrorMessage } = load('lib/api.ts', { axios, '@/store/authStore': { useAuthStore } }, { localStorage, window: { location: { origin: 'https://frontend.test', replace() {} } } })
  const requests = []
  api.defaults.adapter = async config => { requests.push(config); return { data: {}, status: 200, statusText: 'OK', headers: {}, config } }
  const community = load('lib/communityApi.ts', { './api': api })
  return { api, community, requests, useAuthStore, localStorage, getErrorMessage }
}
test('moderation transitions enforce rating and consent eligibility', () => {
  const { community } = setup()
  assert.deepEqual(Array.from(community.transitions({ status: 'PENDING', rating: 3, consent_public: true })), ['REJECTED'])
  assert.deepEqual(Array.from(community.transitions({ status: 'PENDING', rating: 5, consent_public: false })), ['REJECTED'])
  assert.deepEqual(Array.from(community.transitions({ status: 'PENDING', rating: 4, consent_public: true })), ['APPROVED', 'REJECTED'])
  assert.deepEqual(Array.from(community.transitions({ status: 'APPROVED', rating: 5, consent_public: true })), ['UNPUBLISHED', 'REJECTED'])
  assert.deepEqual(Array.from(community.transitions({ status: 'REJECTED', rating: 5, consent_public: true })), ['PENDING'])
})
test('feedback submission sends exact contract fields', async () => {
  const { community, requests } = setup()
  const body = { rating: 4, category: 'VOICE', message: 'test', consent_public: true }
  await community.submitFeedback(body)
  assert.equal(requests[0].url, '/api/v1/feedback')
  assert.equal(requests[0].method, 'post')
  assert.deepEqual(JSON.parse(requests[0].data), body)
})
test('deletion sends exact confirmation ID and encodes route parameter', async () => {
  const { community, requests } = setup()
  await community.deleteFeedback('id/with space')
  assert.equal(requests[0].url, '/api/v1/admin/feedback/id%2Fwith%20space')
  assert.equal(requests[0].params.confirm, 'id/with space')
  assert.equal(requests[0].method, 'delete')
})
test('avatar upload uses multipart avatar field without manually setting boundary', async () => {
  const { community, requests } = setup()
  await community.uploadAvatar(new File(['test'], 'image.png', { type: 'image/png' }))
  assert.equal(requests[0].url, '/api/v1/users/me/avatar')
  assert.equal(requests[0].data.get('avatar').name, 'image.png')
  assert.equal(requests[0].data.get('file'), null)
})
test('avatar 404 is absence, storage errors are rejected', async () => {
  const { community, api } = setup()
  api.defaults.adapter = async config => ({ status: 404, data: new Blob(), headers: {}, config })
  assert.equal(await community.readAvatar(), null)
  api.defaults.adapter = async config => { throw new axios.AxiosError('Unavailable', 'ERR_BAD_RESPONSE', config, null, { status: 503 }) }
  await assert.rejects(community.readAvatar())
})
test('own activity and admin filters preserve contract pagination and timezone', async () => {
  const { community, requests } = setup()
  const params = { offset: 20, limit: 20, module: 'VOICE', since: '2026-10-09T00:00:00+05:30' }
  await community.activity(params)
  assert.equal(requests[0].url, '/api/v1/activity/me')
  assert.equal(requests[0].params.since, params.since)
  assert.equal(requests[0].params.user_id, undefined)
  await community.activity({ ...params, user_id: 'farmer-id' }, true)
  assert.equal(requests[1].url, '/api/v1/admin/activity')
  assert.equal(requests[1].params.user_id, 'farmer-id')
})
test('bearer access token stays on Gateway origin and is never sent to staff service', async () => {
  const { api, useAuthStore, requests } = setup()
  useAuthStore.getState().setAuth({ id: 'one', email: 'test@example.test', full_name: null, role: 'FARMER' }, 'access-test', 'refresh-test')
  await api.get('/api/v1/users/me')
  await api.get('https://pest.test/api/v1/few-shot/classes')
  await api.post('/api/v1/auth/login', { email: 'test', password: 'test' })
  assert.equal(requests[0].headers.Authorization, 'Bearer access-test')
  assert.equal(requests[1].headers.Authorization, undefined)
  assert.equal(requests[2].headers.Authorization, undefined)
})
test('AI retries keep a request UUID while new operations receive distinct UUIDs', async () => {
  const { api, requests } = setup()
  await api.post('/api/v1/pest/detect', new FormData())
  await api.post('/api/v1/pest/detect', new FormData())
  const id = requests[0].headers['X-Request-ID']
  assert.match(id, /^[0-9a-f-]{36}$/)
  assert.notEqual(requests[1].headers['X-Request-ID'], id)
  await api.post('/api/v1/pest/detect', new FormData(), { headers: { 'X-Request-ID': id } })
  assert.equal(requests[2].headers['X-Request-ID'], id)
})
test('server identity stays unverified after token storage and private profile fields stay in memory', () => {
  const { useAuthStore, localStorage } = setup()
  useAuthStore.getState().setAuth({ id: 'one', email: 'test@example.test', full_name: null, role: 'SYSTEM_ADMIN' }, 'access-test', 'refresh-test')
  assert.equal(useAuthStore.getState().identityVerified, false)
  useAuthStore.getState().updateUser({ id: 'one', email: 'test@example.test', full_name: null, role: 'FARMER', phone: '123456789', district: 'Galle' })
  assert.equal(useAuthStore.getState().identityVerified, true)
  const persisted = JSON.parse(localStorage.getItem('paddyguard_auth'))
  assert.equal(persisted.user.phone, undefined)
  assert.equal(persisted.user.district, undefined)
  useAuthStore.getState().logout()
  assert.equal(localStorage.getItem('paddyguard_auth'), null)
  assert.equal(useAuthStore.getState().identityVerified, false)
})
test('string and FastAPI validation errors produce renderable messages', () => {
  const { getErrorMessage } = setup()
  assert.equal(getErrorMessage({ response: { data: { detail: 'Forbidden' } } }, 'fallback'), 'Forbidden')
  assert.equal(getErrorMessage({ response: { data: { detail: [{ msg: 'invalid rating' }] } } }, 'fallback'), 'invalid rating')
  assert.equal(getErrorMessage({}, 'fallback'), 'fallback')
})
test('voice follow-up payloads remain Sinhala when interface language changes', () => {
  const { default: FollowUpDialog } = load('components/voice/FollowUpDialog.tsx', {
    'react/jsx-runtime': jsxRuntime,
    '@/i18n/text': { uiText: text => `translated-${text}` },
    'framer-motion': { motion: { div: 'div' }, AnimatePresence: 'section' },
    'lucide-react': { AlertTriangle: 'span' }, '@/components/ui/Button': 'button',
    '@/lib/disease': { formatConfidence: value => `${value * 100}%` },
  })
  const answers = []
  const tree = FollowUpDialog({ question: 'test', questionEn: 'test', questionNumber: 1, maxQuestions: 3, confidence: 0.4, onAnswer: value => answers.push(value), onSkip() {} })
  function visit(node) { if (!node || typeof node !== 'object') return; if (node.props?.variant && node.props?.onClick) node.props.onClick(); const children = node.props?.children; for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) visit(child) }
  visit(tree)
  assert.deepEqual(answers, ['නෑ', 'ඔව්'])
})
test('expired access tokens refresh once and update the active session before retrying', async () => {
  const { api, useAuthStore } = setup()
  useAuthStore.getState().setAuth({ id: 'one', email: 'test@example.test', full_name: null, role: 'FARMER' }, 'expired-access', 'valid-refresh')
  const originalPost = axios.post
  let refreshes = 0, attempts = 0
  axios.post = async (url, body) => { assert.equal(url, 'https://gateway.test/api/v1/auth/refresh'); assert.equal(body.refresh_token, 'valid-refresh'); refreshes++; return { data: { access_token: 'new-access', refresh_token: 'new-refresh' } } }
  api.defaults.adapter = async config => {
    attempts++
    if (!config._retry) throw new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, null, { status: 401 })
    assert.equal(config.headers.Authorization, 'Bearer new-access')
    return { data: {}, status: 200, headers: {}, config }
  }
  try { await api.get('/api/v1/users/me'); assert.equal(refreshes, 1); assert.equal(attempts, 2); assert.equal(useAuthStore.getState().accessToken, 'new-access'); assert.equal(useAuthStore.getState().refreshToken, 'new-refresh') } finally { axios.post = originalPost }
})
test('invalid login does not refresh a previously stored session', async () => {
  const { api, useAuthStore } = setup()
  useAuthStore.getState().setAuth({ id: 'one', email: 'test@example.test', full_name: null, role: 'FARMER' }, 'access', 'refresh')
  const originalPost = axios.post
  let refreshes = 0
  axios.post = async () => { refreshes++; throw new Error('Unexpected refresh') }
  api.defaults.adapter = async config => { throw new axios.AxiosError('Bad credentials', 'ERR_BAD_REQUEST', config, null, { status: 401 }) }
  try { await assert.rejects(api.post('/api/v1/auth/login', { email: 'test', password: 'wrong' })); assert.equal(refreshes, 0) } finally { axios.post = originalPost }
})
test('cancelled profile requests reject instead of updating identity', async () => {
  const { community } = setup()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(community.readProfile(controller.signal), error => axios.isCancel(error))
})
