import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { getSavedLanguage, saveLanguage } from '../src/lib/language.js'

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

function storage(language) {
  const values = new Map(language === undefined ? [] : [['lcp_language', language]])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  })
  return values
}

test('first visit defaults to Russian without persisting an implicit choice', () => {
  const values = storage()
  assert.equal(getSavedLanguage(), 'ru')
  assert.equal(values.has('lcp_language'), false)
})

test('both explicitly saved languages are restored', () => {
  for (const language of ['en', 'ru']) {
    storage(language)
    assert.equal(getSavedLanguage(), language)
  }
})

test('unexpected saved values fall back to Russian', () => {
  for (const value of ['', 'EN', 'fr', 'null', '{}', ' en ']) {
    storage(value)
    assert.equal(getSavedLanguage(), 'ru')
  }
})

test('explicit language changes persist under a dedicated key, leaving theme alone', () => {
  const values = storage()
  values.set('theme', 'dark')
  saveLanguage('en')
  assert.equal(getSavedLanguage(), 'en')
  saveLanguage('ru')
  assert.equal(getSavedLanguage(), 'ru')
  assert.equal(values.get('theme'), 'dark')
})

test('unsupported choices cannot overwrite the saved language', () => {
  const values = storage('en')
  for (const language of [null, undefined, 'fr', 'EN']) saveLanguage(language)
  assert.equal(values.get('lcp_language'), 'en')
})

test('unavailable storage falls back safely and does not block switching', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable') } })
  assert.equal(getSavedLanguage(), 'ru')
  assert.doesNotThrow(() => saveLanguage('en'))
})
