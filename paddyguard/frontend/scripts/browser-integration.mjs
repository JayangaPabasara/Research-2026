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
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { windowsHide: true, stdio: 'pipe' })
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9334', `--user-data-dir=${profileDirectory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket, sequence = 0
const pending = new Map(), browserErrors = [], requests = []
async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) { try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok) return await response.json().catch(() => null) } catch { /* wait for owned process */ } await delay(150) }
  throw new Error(`Local QA service did not start: ${url}`)
}
function send(method, params = {}) {
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
const profile = { id: 'qa-farmer', email: 'qa@example.test', full_name: 'QA Farmer', role: 'FARMER', is_active: true, preferred_language: 'en', district: 'Gampaha', created_at: '2026-10-01T00:00:00Z' }
const diagnosis = { disease: 'Brown Spot', label_id: 1, confidence: 0.86, is_ood: false, ood_reason: null, needs_followup: false, status: 'complete', message: null, all_scores: { 'Brown Spot': 0.86, 'Leaf Blast': 0.14 }, session_id: 'qa-voice', sinhala_transcript: 'කොළ වල දුඹුරු පුල්ලි තියෙනවා', english_translation: 'Brown spots on leaves', followup_question: null, followup_question_en: null, confidence_trajectory: [{ step: 1, label: 'Initial', disease: 'Brown Spot', confidence: 0.86 }] }
try {
  await ready('http://127.0.0.1:5178')
  console.log('Local Vite preview ready')
  const targets = await ready('http://127.0.0.1:9334/json')
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  console.log('Isolated Chromium connected')
  socket.onmessage = async event => {
    try {
    const message = JSON.parse(event.data)
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (message.error) task?.reject(new Error(JSON.stringify(message.error))); else task?.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description || ''))
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) { await send('Fetch.continueRequest', { requestId }); return }
    requests.push({ path: url.pathname, method: request.method })
    let postData = request.postData
    if (!postData && request.method !== 'GET' && request.method !== 'OPTIONS' && message.params.networkId) {
      postData = (await send('Network.getRequestPostData', { requestId: message.params.networkId })).postData
    }
    let data = { items: [], total: 0, offset: 0, limit: 20 }, status = 200
    if (url.pathname === '/api/v1/users/me') {
      if (request.method === 'PATCH') Object.assign(profile, JSON.parse(postData || '{}'))
      data = profile
    } else if (url.pathname.endsWith('/avatar')) { status = 404; data = { detail: 'No avatar' } }
    else if (url.pathname === '/api/v1/chat/topics') data = { topics: ['Rice Brown Spot', 'Brown Planthopper'] }
    else if (url.pathname === '/api/v1/chat/message') data = { session_id: JSON.parse(postData || '{}').session_id, reply: 'Original English advice. Chemical name stays unchanged.', language: 'en', in_scope: true, chemicals: [], follow_up_question: null }
    else if (url.pathname.endsWith('/few-shot/classes')) data = { classes: [] }
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' }], body: Buffer.from(JSON.stringify(data)).toString('base64') })
    } catch (error) {
      browserErrors.push(error.message)
      for (const task of pending.values()) task.reject(error)
      pending.clear()
      socket.close()
    }
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*api*', requestStage: 'Request' }] })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (!localStorage.getItem('qa_seeded')) {
    localStorage.setItem('qa_seeded', 'yes');
    localStorage.setItem('paddyguard_language', 'en');
    localStorage.setItem('paddyguard_auth', ${JSON.stringify(JSON.stringify({ user: profile, accessToken: 'synthetic-qa-access', refreshToken: 'synthetic-qa-refresh' }))});
    localStorage.setItem('paddyguard_chat_sessions', ${JSON.stringify(JSON.stringify({ 'qa-farmer': { sessionId: 'qa-chat', conversationLanguage: 'en', microphoneLanguage: 'en-US', messages: [{ id: 'saved-message', role: 'assistant', content: 'Original English advice. Chemical name stays unchanged.', language: 'en', timestamp: '2026-10-10T00:00:00Z' }] } }))});
    localStorage.setItem('paddyguard_voice_workspaces', ${JSON.stringify(JSON.stringify({ 'qa-farmer': diagnosis }))});
  }` })
  for (const width of [390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 })
    await send('Page.navigate', { url: 'http://127.0.0.1:5178/chat' })
    await waitFor(`!!document.querySelector('.pg-treatment textarea')`)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true, `Treatment overflow at ${width}`)
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('paddyguard_chat_sessions'))['qa-farmer'].sessionId`), 'qa-chat')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pg-chat-message')).animationName`), 'none')
    if (width === 390) {
      await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'සිංහල').click()`)
      await waitFor(`document.documentElement.lang === 'si'`)
      assert.equal(await evaluate(`document.querySelector('.pg-treatment select').value`), 'en')
      assert.equal(await evaluate(`document.body.textContent.includes('Original English advice.')`), true)
      assert.equal(await evaluate(`localStorage.getItem('paddyguard_app_lang')`), null)
      await evaluate(`document.querySelectorAll('.pg-treatment [role=tab]')[1].click()`)
      await evaluate(`document.querySelectorAll('.pg-treatment [role=tab]')[0].click()`)
      assert.equal(await evaluate(`JSON.parse(localStorage.getItem('paddyguard_chat_sessions'))['qa-farmer'].sessionId`), 'qa-chat')
    }
    if (width === 390 || width === 1440) {
      const screenshot = await send('Page.captureScreenshot', { format: 'png' })
      const filename = path.join(profileDirectory, `treatment-${width}.png`)
      fs.writeFileSync(filename, Buffer.from(screenshot.data, 'base64'))
      console.log(`Screenshot: ${filename}`)
    }
    await send('Page.navigate', { url: 'http://127.0.0.1:5178/voice' })
    await waitFor(`!!document.querySelector('.pg-voice') && document.body.textContent.includes('86%')`)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true, `Voice overflow at ${width}`)
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('paddyguard_voice_workspaces'))['qa-farmer'].session_id`), 'qa-voice')
    console.log(`PASS Treatment/Voice viewport ${width}, restored sessions and reduced motion`)
  }
  for (const route of ['pest', 'leaf', 'history', 'profile', 'feedback']) {
    await send('Page.navigate', { url: `http://127.0.0.1:5178/${route}` })
    await waitFor(`document.querySelector('main') && document.querySelector('main').textContent.trim().length > 30`)
    assert.equal(await evaluate(`document.documentElement.lang`), 'si')
    if (route === 'history') await waitFor(`document.body.textContent.includes('ක්‍රියාකාරකම්')`)
    console.log(`PASS authenticated ${route} renders with persisted Sinhala UI`)
  }
  assert.ok(requests.some(request => request.path === '/api/v1/activity/me'))
  assert.equal(requests.some(request => request.path === '/api/v1/admin/activity'), false)
  assert.equal(requests.some(request => request.path === '/api/v1/chat/message'), false, 'Returning to Treatment must not replay messages')
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'English').click()`)
  await waitFor(`document.documentElement.lang === 'en'`)
  await evaluate(`history.pushState({usr: {source: 'detection', detectionType: 'pest', initialTopic: 'Brown Planthopper', handoffId: 'browser-intent-one'}, key: 'browser-intent-one'}, '', '/chat'); dispatchEvent(new PopStateEvent('popstate'));`)
  await waitFor(`!!document.querySelector('.pg-treatment') && document.body.textContent.includes('දුඹුරු මකුණා')`)
  await waitFor(`document.body.textContent.includes('Original English advice.')`)
  assert.equal(requests.filter(request => request.path === '/api/v1/chat/message' && request.method === 'POST').length, 1)
  assert.equal(await evaluate(`document.documentElement.lang`), 'en')
  assert.equal(await evaluate(`document.querySelector('.pg-treatment select').value`), 'si')
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('paddyguard_chat_sessions'))['qa-farmer'].microphoneLanguage`), 'si-LK')
  await send('Page.navigate', { url: 'http://127.0.0.1:5178/chat' })
  await waitFor(`!!document.querySelector('.pg-treatment textarea')`)
  assert.equal(requests.filter(request => request.path === '/api/v1/chat/message' && request.method === 'POST').length, 1)
  console.log('PASS intentional detection sends once in React StrictMode; returning does not resend or force global Sinhala')
  await send('Page.navigate', { url: 'http://127.0.0.1:5178/voice' })
  await waitFor(`!!document.querySelector('.pg-voice') && document.body.textContent.includes('86%')`)
  await evaluate(`Array.from(document.querySelectorAll('.pg-voice button')).find(button => button.textContent.trim() === 'New Diagnosis').click()`)
  await waitFor(`!!document.querySelector('[role=dialog]')`)
  assert.equal(await evaluate(`!!JSON.parse(localStorage.getItem('paddyguard_voice_workspaces'))['qa-farmer']`), true)
  await evaluate(`Array.from(document.querySelectorAll('[role=dialog] button')).find(button => button.textContent.trim() === 'New Diagnosis').click()`)
  await waitFor(`!JSON.parse(localStorage.getItem('paddyguard_voice_workspaces'))['qa-farmer']`)
  console.log('PASS browser New Diagnosis requires confirmation and clears only the current workspace')
  assert.deepEqual(browserErrors, [])
  console.log('PASS isolated browser QA; no replay, no admin activity requests, no runtime exceptions')
} finally {
  socket?.close()
  browser.kill()
  server.kill()
  // The disposable profile is outside the repository. Retain it for OS cleanup.
}
