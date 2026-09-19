// Run: node --test tests/telegram.test.mjs
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { initializeTelegramWebApp } from '../src/lib/telegram.js'

const originalWindow = globalThis.window
afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

function install(overrides = {}) {
  const calls = []
  const webApp = {
    platform: 'ios',
    ready() { assert.equal(this, webApp); calls.push('ready') },
    expand() { assert.equal(this, webApp); calls.push('expand') },
    requestFullscreen() { assert.equal(this, webApp); calls.push('fullscreen') },
    ...overrides,
  }
  globalThis.window = { Telegram: { WebApp: webApp } }
  return { webApp, calls }
}

test('ordinary browser or non-browser environment is a safe no-op', () => {
  delete globalThis.window
  assert.doesNotThrow(initializeTelegramWebApp)
  for (const window of [{}, { Telegram: {} }, { Telegram: { WebApp: null } }]) {
    globalThis.window = window
    assert.doesNotThrow(initializeTelegramWebApp)
  }
})

test('SDK loaded outside Telegram does not issue bridge calls', () => {
  const { calls } = install({ platform: 'unknown', initData: '' })
  initializeTelegramWebApp()
  assert.deepEqual(calls, [])
})

test('Telegram startup calls ready, expand and fullscreen in order', () => {
  const { calls } = install()
  initializeTelegramWebApp()
  assert.deepEqual(calls, ['ready', 'expand', 'fullscreen'])
})

test('fullscreen launch still signals readiness and expands without another request', () => {
  const { calls } = install({ isFullscreen: true })
  initializeTelegramWebApp()
  assert.deepEqual(calls, ['ready', 'expand'])
})

test('legacy Telegram without requestFullscreen retains expansion', () => {
  const { calls } = install({ requestFullscreen: undefined })
  assert.doesNotThrow(initializeTelegramWebApp)
  assert.deepEqual(calls, ['ready', 'expand'])
})

test('missing expand still allows readiness and fullscreen', () => {
  const { calls } = install({ expand: undefined })
  initializeTelegramWebApp()
  assert.deepEqual(calls, ['ready', 'fullscreen'])
})

test('fullscreen exception is harmless and is not retried by repeated initialization', () => {
  let requests = 0
  const { calls } = install({ requestFullscreen() { requests++; throw new Error('unsupported') } })
  assert.doesNotThrow(initializeTelegramWebApp)
  assert.doesNotThrow(initializeTelegramWebApp)
  assert.deepEqual(calls, ['ready', 'expand'])
  assert.equal(requests, 1)
})

test('asynchronous fullscreen rejection is handled', async () => {
  install({ requestFullscreen: () => Promise.reject(new Error('denied')) })
  assert.doesNotThrow(initializeTelegramWebApp)
  await new Promise(resolve => setImmediate(resolve))
})

test('repeated or reentrant initialization never duplicates startup calls', () => {
  let requests = 0
  const { calls } = install({ requestFullscreen() { requests++; initializeTelegramWebApp() } })
  initializeTelegramWebApp()
  initializeTelegramWebApp()
  initializeTelegramWebApp()
  assert.deepEqual(calls, ['ready', 'expand'])
  assert.equal(requests, 1)
})

test('optional bridge method failure does not prevent other startup calls', () => {
  const { calls } = install({ ready() { throw new Error('bridge unavailable') } })
  assert.doesNotThrow(initializeTelegramWebApp)
  assert.deepEqual(calls, ['expand', 'fullscreen'])
})

test('browser no-op does not prevent initialization after Telegram becomes available', () => {
  const { webApp, calls } = install({ platform: 'unknown', initData: '' })
  initializeTelegramWebApp()
  webApp.platform = 'android'
  initializeTelegramWebApp()
  assert.deepEqual(calls, ['ready', 'expand', 'fullscreen'])
})
