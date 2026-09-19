import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { openSupportInTelegram, validateSupportUrl } from '../src/lib/support.js'

const originalWindow = globalThis.window
afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

const url = 'https://t.me/fixture_support'

test('accepts a public Telegram username URL, trimming surrounding whitespace', () => {
  for (const value of [url, 'https://t.me/Support_123', 'https://t.me/' + 'a'.repeat(32)]) {
    assert.equal(validateSupportUrl(value), value)
  }
  assert.equal(validateSupportUrl(` ${url} `), url)
})

test('missing values and non-username URLs cannot enable support', () => {
  for (const value of [
    undefined, null, '', ' ', 42, {}, 'javascript:alert(1)', 'http://t.me/support',
    '//t.me/support', 'https://telegram.me/support', 'https://example.com/support',
    'https://t.me.evil.test/support', 'https://t.me@evil.test/support',
    'https://user@t.me/support', 'https://t.me:443/support', 'https://t.me/',
    `${url}/`, `${url}/extra`, `${url}?start=anything`, `${url}#anything`,
    'https://t.me/+invite', 'https://t.me/support-name', 'https://t.me/%73upport',
    'https://t.me/support\\other', 'https://t.me/' + 'a'.repeat(33),
  ]) assert.equal(validateSupportUrl(value), null, String(value))
})

test('browser and missing SDK/method leave the ordinary link as fallback', () => {
  delete globalThis.window
  assert.equal(openSupportInTelegram(url), false)
  for (const window of [{}, { Telegram: {} }, { Telegram: { WebApp: { platform: 'ios' } } }]) {
    globalThis.window = window
    assert.equal(openSupportInTelegram(url), false)
  }
  globalThis.window = { Telegram: { WebApp: { platform: 'unknown', initData: '', openTelegramLink() { assert.fail('Browser must use the anchor') } } } }
  assert.equal(openSupportInTelegram(url), false)
})

test('Mini App uses the official method with the validated URL and receiver', () => {
  const calls = []
  const webApp = { platform: 'android', openTelegramLink(value) { assert.equal(this, webApp); calls.push(value) } }
  globalThis.window = { Telegram: { WebApp: webApp } }
  assert.equal(openSupportInTelegram(url), true)
  assert.deepEqual(calls, [url])
})

test('unsafe URLs are rejected before calling the Telegram bridge', () => {
  globalThis.window = { Telegram: { WebApp: { platform: 'ios', openTelegramLink() { assert.fail('Unsafe URL reached Telegram') } } } }
  assert.equal(openSupportInTelegram('https://example.com'), false)
  assert.equal(openSupportInTelegram(null), false)
})

test('synchronous bridge failure leaves native anchor navigation available', () => {
  globalThis.window = { Telegram: { WebApp: { platform: 'ios', openTelegramLink() { throw new Error('unavailable') } } } }
  assert.equal(openSupportInTelegram(url), false)
})

test('a rejecting optional promise falls back to a safe browser link', async () => {
  const calls = []
  globalThis.window = {
    Telegram: { WebApp: { platform: 'ios', openTelegramLink: () => Promise.reject(new Error('unavailable')) } },
    open: (...args) => calls.push(args),
  }
  assert.equal(openSupportInTelegram(url), true)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(calls, [[url, '_blank', 'noopener,noreferrer']])
})
