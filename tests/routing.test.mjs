// Run: node --test tests/routing.test.mjs
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { migrateLegacyHashRoute } from '../src/lib/routing.js'

const originalWindow = globalThis.window
afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

function install(path) {
  const state = { existing: 'history state' }
  const calls = []
  globalThis.window = {
    location: new URL(path, 'https://lcpn3twork.com'),
    history: {
      state,
      replaceState(nextState, title, url) {
        assert.equal(nextState, state)
        calls.push(url)
        window.location = new URL(url, window.location)
      },
    },
  }
  return calls
}

for (const [legacy, clean] of [['/#/account', '/app'], ['/#/login', '/login']]) {
  test(`${legacy} is replaced with ${clean} without adding a history entry`, () => {
    const calls = install(legacy)
    migrateLegacyHashRoute()
    assert.deepEqual(calls, [clean])
    assert.equal(window.location.href, `https://lcpn3twork.com${clean}`)
    migrateLegacyHashRoute()
    assert.equal(calls.length, 1)
  })
}

test('legacy migration preserves the query string and Telegram initData', () => {
  const calls = install('/?tgWebAppStartParam=fixture%2Bvalue#/account')
  const webApp = { initData: 'query_id=fixture%2Bvalue&user=%7B%7D&hash=fixture' }
  window.Telegram = { WebApp: webApp }
  migrateLegacyHashRoute()
  assert.deepEqual(calls, ['/app?tgWebAppStartParam=fixture%2Bvalue'])
  assert.equal(window.Telegram.WebApp, webApp)
  assert.equal(webApp.initData, 'query_id=fixture%2Bvalue&user=%7B%7D&hash=fixture')
})

test('unrelated hashes and route lookalikes are never converted', () => {
  for (const hash of [
    '', '#features', '#/other', '#/app', '#/account/extra', '#/login-elsewhere',
    '#/login?redirect=https://example.com', '#//example.com', '#https://example.com',
    '#/%61ccount', '#tgWebAppData=fixture&tgWebAppVersion=8.0',
  ]) {
    const calls = install(`/${hash}`)
    const before = window.location.href
    migrateLegacyHashRoute()
    assert.deepEqual(calls, [], hash)
    assert.equal(window.location.href, before)
  }
})

test('hashes on clean paths are left alone', () => {
  for (const path of ['/app#/login', '/login#/account', '/other#/login']) {
    const calls = install(path)
    migrateLegacyHashRoute()
    assert.deepEqual(calls, [], path)
  }
})

test('migration is harmless without a browser window', () => {
  delete globalThis.window
  assert.doesNotThrow(migrateLegacyHashRoute)
})
