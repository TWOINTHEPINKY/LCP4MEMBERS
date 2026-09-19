// Run: node --test tests/auth.test.mjs
import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let auth
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window

before(async () => {
  server = await createServer({
    configFile: false, envDir: false, logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  auth = await server.ssrLoadModule('/src/lib/auth.js')
})
afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})
after(async () => { await server?.close() })

test('Mini App detection needs raw nonempty initData, never unsafe user data', () => {
  delete globalThis.window
  assert.equal(auth.getTelegramInitData(), null)
  for (const window of [{}, { Telegram: {} }, { Telegram: { WebApp: { initDataUnsafe: { user: { id: 1 } } } } }]) {
    globalThis.window = window
    assert.equal(auth.getTelegramInitData(), null)
  }
  for (const initData of ['', '  ', null, 123]) {
    globalThis.window = { Telegram: { WebApp: { initData } } }
    assert.equal(auth.getTelegramInitData(), null)
  }
  const raw = 'user=%7B%7D&query_id=a%2Bb%3D&hash=test-fixture'
  globalThis.window = { Telegram: { WebApp: { initData: raw } } }
  assert.equal(auth.getTelegramInitData(), raw)
})

test('concurrent StrictMode callers share one exchange with unmodified raw data', async () => {
  const raw = 'query_id=test%2Bvalue&user=%7B%7D&hash=fixture'
  let complete
  let calls = 0
  globalThis.fetch = (url, options) => {
    calls++
    assert.ok(url.endsWith('/auth/telegram-webapp'))
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(options.body), { init_data: raw })
    assert.equal(options.cache, 'no-store')
    assert.equal(options.credentials, 'omit')
    return new Promise(resolve => { complete = resolve })
  }
  const first = auth.authenticateTelegramWebApp(raw)
  const second = auth.authenticateTelegramWebApp(raw)
  assert.equal(first, second)
  assert.equal(calls, 1)
  complete(Response.json({ access_token: 'fixture-token' }))
  assert.deepEqual(await first, { access_token: 'fixture-token' })
  await second
})

test('a failed exchange is released for explicit retry, without automatic requests', async () => {
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return calls === 1
      ? Response.json({ detail: 'invalid_telegram_webapp_data' }, { status: 401 })
      : Response.json({ access_token: 'retry-token' })
  }
  await assert.rejects(auth.authenticateTelegramWebApp('fixture'), { code: 'invalid_telegram_webapp_data', status: 401 })
  assert.equal(calls, 1)
  assert.deepEqual(await auth.authenticateTelegramWebApp('fixture'), { access_token: 'retry-token' })
  assert.equal(calls, 2)
})

test('missing initData and missing returned JWT never count as authentication', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json({ user: { id: 1 } }) }
  for (const raw of [null, '', ' ', 1]) {
    await assert.rejects(auth.authenticateTelegramWebApp(raw), { code: 'miniAppFailed' })
  }
  assert.equal(calls, 0)
  await assert.rejects(auth.authenticateTelegramWebApp('fixture'), { code: 'miniAppFailed' })
})

test('completed requests are not cached as later logins', async () => {
  let calls = 0
  globalThis.fetch = async () => Response.json({ access_token: `fixture-${++calls}` })
  assert.equal((await auth.authenticateTelegramWebApp('fixture')).access_token, 'fixture-1')
  assert.equal((await auth.authenticateTelegramWebApp('fixture')).access_token, 'fixture-2')
})

test('Mini App failures map to safe retry, network or storage messages', () => {
  assert.equal(auth.telegramAuthError(new auth.ApiError('invalid_telegram_webapp_data', 401)), 'miniAppFailed')
  assert.equal(auth.telegramAuthError(new auth.ApiError('network')), 'network')
  assert.equal(auth.telegramAuthError(new auth.ApiError('configuration')), 'configuration')
  assert.equal(auth.telegramAuthError(new auth.ApiError('storage')), 'storage')
  assert.equal(auth.telegramAuthError(new DOMException('', 'QuotaExceededError')), 'storage')
})
