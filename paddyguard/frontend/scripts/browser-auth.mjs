// Isolated browser QA: synthetic farmer, intercepted APIs, disposable browser profile.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const executable = process.env.BROWSER_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(file => fs.existsSync(file))
if (!executable) throw new Error('Install a Chromium browser or set BROWSER_EXECUTABLE for local QA.')
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'paddyguard-browser-'))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5181', '--strictPort'], { windowsHide: true, stdio: 'pipe' })
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9337', `--user-data-dir=${profileDirectory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket, sequence = 0
const pending = new Map(), browserErrors = [], requests = []
async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) { try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok) return await response.json().catch(() => null) } catch { /* wait for owned process */ } await delay(150) }
  throw new Error(`Local QA service did not start: ${url}`)
}
function send(method, params = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.resolve({})
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)) }, 15000)
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value) }, reject: error => { clearTimeout(timeout); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails))
  return response.result.value
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await delay(100) }
  throw new Error(`Browser condition timed out: ${expression}`)
}

const origin = 'http://127.0.0.1:5181'
const profile = { id: 'auth-qa', email: 'qa@example.test', full_name: 'QA Farmer', role: 'FARMER', is_active: true, preferred_language: 'en' }
let loginMode = 'error'
try {
  await ready(origin)
  const targets = await ready('http://127.0.0.1:9337/json')
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  socket.onmessage = async event => {
    const message = JSON.parse(event.data)
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (message.error) task?.reject(new Error(JSON.stringify(message.error))); else task?.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) { await send('Fetch.continueRequest', { requestId }); return }
    requests.push({ path: url.pathname, method: request.method, body: request.postData })
    let data = { items: [], total: 0 }, status = 200
    if (request.method === 'OPTIONS') { data = {} }
    else if (url.pathname.endsWith('/auth/login')) {
      await delay(600)
      if (loginMode === 'error') { status = 401; data = { detail: 'Invalid email or password' } }
      else data = { access_token: 'qa-access', refresh_token: 'qa-refresh', token_type: 'bearer' }
    } else if (url.pathname.endsWith('/users/me')) data = profile
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: '*' }], body: Buffer.from(JSON.stringify(data)).toString('base64') })
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('paddyguard_language', localStorage.getItem('paddyguard_language') || 'en')` })
  async function navigate(route) { await send('Page.navigate', { url: origin + route }); await waitFor(`!!document.querySelector('.pg-auth-card')`) }
  async function submit() {
    await evaluate(`(() => { const inputs = document.querySelectorAll('form input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(inputs[0], 'qa@example.test'); inputs[0].dispatchEvent(new Event('input', {bubbles:true})); setter.call(inputs[1], 'test-password'); inputs[1].dispatchEvent(new Event('input', {bubbles:true})); })()`)
    await evaluate(`document.querySelector('form').requestSubmit()`)
  }
  await navigate('/login')
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'Farmer Login')
  await evaluate(`document.querySelector('button[aria-controls][aria-label]').click()`)
  assert.equal(await evaluate(`document.querySelector('input[autocomplete="current-password"]').type`), 'text')
  await evaluate(`document.querySelector('button[aria-controls][aria-label]').click()`)
  assert.equal(await evaluate(`document.querySelector('input[autocomplete="current-password"]').type`), 'password')
  await evaluate(`document.querySelector('.pg-auth-language button').click()`)
  await waitFor(`document.documentElement.lang === 'si'`)
  await navigate('/system-admin-login')
  assert.equal(await evaluate(`localStorage.getItem('paddyguard_language')`), 'si')
  await evaluate(`document.querySelectorAll('.pg-auth-language button')[1].click()`)
  await waitFor(`document.documentElement.lang === 'en'`)
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'System Admin Login')
  assert.equal(await evaluate(`!!document.querySelector('a[href="/register"]')`), false)
  await submit()
  await waitFor(`document.querySelector('[type=submit]').disabled`)
  assert.match(await evaluate(`document.querySelector('[type=submit]').textContent`), /Signing in/)
  await waitFor(`!!document.querySelector('[role=alert]')`)
  assert.equal(await evaluate(`document.querySelector('[role=alert]').textContent`), 'Invalid email or password')
  assert.equal(await evaluate(`document.querySelector('[type=submit]').disabled`), false)
  assert.equal(await evaluate(`document.querySelector('input').getAttribute('aria-describedby')`), 'auth-error')
  loginMode = 'success'
  await submit()
  await waitFor(`document.querySelector('[role=alert]')?.textContent.includes('System Admin access is required')`)
  assert.equal(await evaluate(`location.pathname`), '/system-admin-login')
  assert.equal(await evaluate(`localStorage.getItem('paddyguard_auth')`), null)
  console.log('PASS submit payload, loading, errors, password toggle, language persistence, farmer denied admin access')
  await navigate('/login')
  fs.mkdirSync('docs/auth-screenshots', { recursive: true })
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await delay(900)
    if (width >= 768) await waitFor(`getComputedStyle(document.querySelector('.pg-auth-hero-copy')).opacity === '1'`)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pg-auth-hero')).display === 'none'`), width < 768)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pg-auth')).gridTemplateColumns.split(' ').length`), width < 768 ? 1 : 2)
    if (width >= 768) assert.equal(await evaluate(`document.documentElement.scrollHeight <= innerHeight`), true)
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    fs.writeFileSync(`docs/auth-screenshots/login-${width}.png`, Buffer.from(shot.data, 'base64'))
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pg-auth-photo'), '::before').animationName`), 'none')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 420, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true)
  await evaluate(`document.querySelector('[type=submit]').scrollIntoView()`)
  assert.equal(await evaluate(`document.querySelector('[type=submit]').getBoundingClientRect().bottom <= innerHeight`), true)
  await navigate('/register')
  assert.equal(await evaluate(`document.querySelectorAll('input[autocomplete="new-password"]').length`), 2)
  await navigate('/staff-login')
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'Staff / Expert Login')
  await navigate('/login')
  await submit()
  await waitFor(`location.pathname === '/'`)
  const loginRequest = requests.find(request => request.path.endsWith('/auth/login') && request.method === 'POST')
  assert.deepEqual(JSON.parse(loginRequest.body), { email: 'qa@example.test', password: 'test-password' })
  await evaluate(`localStorage.removeItem('paddyguard_auth')`)
  profile.role = 'SYSTEM_ADMIN'
  await navigate('/system-admin-login')
  await submit()
  await waitFor(`location.pathname === '/system-admin'`)
  assert.deepEqual(browserErrors, [])
  console.log('PASS six responsive widths, screenshots, reduced motion, short mobile scrolling, registration autocomplete, staff heading, farmer and system admin redirects')
} finally { for (const task of pending.values()) task.resolve({}); pending.clear(); socket?.close(); browser.kill(); server.kill() }
