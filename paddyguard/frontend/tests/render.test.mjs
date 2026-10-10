import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
const require = createRequire(import.meta.url)
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query')
const root = path.resolve('src')
const modules = new Map()
const values = new Map()
const localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
const document = { documentElement: { lang: 'si' } }
function load(filename) {
  if (filename.endsWith('.css')) return {}
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) filename = ['.ts', '.tsx', '/index.ts'].map(ext => filename + ext).find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  if (!filename) throw new Error('Module not found')
  if (modules.has(filename)) return modules.get(filename).exports
  const module = { exports: {} }; modules.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env/g, '({})')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports: module.exports, module, require: name => name.startsWith('@/') ? load(path.join(root, name.slice(2))) : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : require(name), localStorage, sessionStorage: localStorage, document, window: { location: { origin: 'https://frontend.test' } }, navigator: {}, console, URL, Blob, FormData, File, crypto: globalThis.crypto, setTimeout, clearTimeout, setInterval, clearInterval }, { filename })
  return module.exports
}
const i18n = load(path.join(root, 'i18n/index.ts')).default
function render(Component, props = {}, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MemoryRouter, {}, React.createElement(Component, props))))
}
test('login renders bilingual labels and separate administrative access links', async () => {
  const Login = load(path.join(root, 'pages/Login.tsx')).default
  await i18n.changeLanguage('en')
  const english = render(Login)
  assert.match(english, /Administrative Access/)
  assert.match(english, /href="\/pest-admin-login"/)
  assert.match(english, /href="\/system-admin-login"/)
  assert.match(english, /aria-expanded="false"/)
  await i18n.changeLanguage('si')
  const sinhala = render(Login)
  assert.match(sinhala, /පරිපාලක පිවිසුම/)
  assert.match(sinhala, /විද්‍යුත් තැපෑල/)
  assert.equal(document.documentElement.lang, 'si')
})
test('feedback form includes consent and never publishes submission automatically', async () => {
  await i18n.changeLanguage('en')
  const Feedback = load(path.join(root, 'pages/Feedback.tsx')).default
  const markup = render(Feedback)
  assert.match(markup, /administrator approval/)
  assert.match(markup, /type="checkbox"/)
  assert.match(markup, /maxLength="2000"/i)
  assert.match(markup, /value="GENERAL"/)
  assert.doesNotMatch(markup, /Your feedback has been saved/)
})
test('testimonials render only public fields and anonymous attribution', async () => {
  const Testimonials = load(path.join(root, 'components/community/Testimonials.tsx')).default
  const client = new QueryClient()
  client.setQueryData(['testimonials'], { items: [{ id: 'test', rating: 5, category: 'VOICE', message: 'Public message', created_at: '2026-10-09T00:00:00Z', display_label: 'Anonymous farmer' }], total: 1, offset: 0, limit: 6 })
  const markup = render(Testimonials, {}, client)
  assert.match(markup, /Public message/)
  assert.match(markup, /Anonymous Farmer/)
  assert.doesNotMatch(markup, /user_id|email|phone|moderated_by/)
  client.clear()
})
test('activity and diagnosis history remain distinct in the history page', () => {
  localStorage.setItem('paddyguard_auth', JSON.stringify({ user: { id: 'farmer-test', email: 'farmer@test.test', full_name: null, role: 'FARMER' }, accessToken: 'test', refreshToken: 'test' }))
  modules.clear()
  const History = load(path.join(root, 'pages/History.tsx')).default
  const auth = load(path.join(root, 'store/authStore.ts')).useAuthStore
  const markup = render(History)
  assert.match(markup, /Activity/)
  assert.match(markup, /No voice diagnoses yet/)
  assert.match(markup, /does not indicate diagnostic confidence/)
  auth.getState().logout()
})
test('admin guard withholds private content until a fresh backend identity is verified', async () => {
  localStorage.setItem('paddyguard_auth', JSON.stringify({ user: { id: 'farmer-test', email: 'farmer@test.test', full_name: null, role: 'SYSTEM_ADMIN' }, accessToken: 'guard-test', refreshToken: 'test' }))
  localStorage.setItem('paddyguard_language', 'en')
  modules.clear()
  const Guard = load(path.join(root, 'components/layout/SystemAdminGuard.tsx')).default
  const client = new QueryClient()
  client.setQueryData(['adminIdentity', 'guard-test'], { id: 'farmer-test', role: 'FARMER', is_active: true })
  const markup = render(Guard, { children: React.createElement('p', {}, 'private dashboard') }, client)
  assert.match(markup, /Loading/)
  assert.doesNotMatch(markup, /private dashboard/)
  client.clear()
})

test('global Sinhala/English switching renders all primary pages without a second language key', async () => {
  modules.clear()
  const auth = load(path.join(root, 'store/authStore.ts')).useAuthStore
  auth.getState().setAuth({ id: 'language-farmer', email: 'qa@example.test', full_name: null, role: 'FARMER' }, 'synthetic', 'synthetic')
  const chat = load(path.join(root, 'store/chatStore.ts')).useChatStore
  chat.getState().ensureSession('language-farmer')
  const language = load(path.join(root, 'i18n/index.ts')).default
  for (const page of ['VoiceDiagnosis', 'LeafDisease', 'PestDetection', 'TreatmentChat', 'History', 'Profile', 'Feedback', 'Login', 'Register', 'SystemAdmin']) {
    const Component = load(path.join(root, `pages/${page}.tsx`)).default
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await language.changeLanguage('en')
    const english = render(Component, {}, client)
    await language.changeLanguage('si')
    const sinhala = render(Component, {}, client)
    assert.notEqual(english, sinhala, `${page} must update its interface language`)
    assert.equal(localStorage.getItem('paddyguard_language'), 'si')
    assert.equal(localStorage.getItem('paddyguard_app_lang'), null)
    client.clear()
  }
  const before = chat.getState().sessions['language-farmer'].sessionId
  await language.changeLanguage('en')
  assert.equal(chat.getState().sessions['language-farmer'].sessionId, before)
  auth.getState().logout()
})

test('received Treatment advice and chemical recommendations remain unchanged on UI language switch', async () => {
  const language = load(path.join(root, 'i18n/index.ts')).default
  const Bubble = load(path.join(root, 'components/chat/ChatBubble.tsx')).default
  const message = { id: 'advice', role: 'assistant', content: 'Original English advice: use the supplied instructions.', language: 'en', timestamp: '2026-10-10T00:00:00Z', chemicals: [{ name: 'Original chemical name', dose_per_liter_water: '1 ml', coverage_per_liter_mixture_acres: '0.1', coverage_per_liter_mixture_hectares: '0.04' }] }
  for (const lang of ['si', 'en']) {
    await language.changeLanguage(lang)
    const markup = render(Bubble, { message })
    assert.match(markup, /Original English advice: use the supplied instructions/)
    assert.match(markup, /Original chemical name/)
    assert.match(markup, /lang="en"/)
  }
})
