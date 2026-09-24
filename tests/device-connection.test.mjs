import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getDeviceConnection, getSubscriptionUrl } from '../src/lib/deviceConnection.js'
import { dashboardMock } from '../src/data/dashboardMock.js'

test('inactive subscriptions always lead to plans, even when access exists', () => {
  for (const client of ['happ', 'incy']) {
    assert.deepEqual(getDeviceConnection(client, { subscription: { active: false }, access: { subscriptionUrl: 'https://access.test/sub' } }), { type: 'plans', to: '/plans' })
  }
})

test('the preview access model honestly reports unavailable for both clients', () => {
  assert.deepEqual(dashboardMock.access, { subscriptionUrl: null, happDeepLink: null })
  for (const client of ['happ', 'incy']) assert.deepEqual(getDeviceConnection(client, dashboardMock), { type: 'unavailable' })
})

test('INCY imports only an actual HTTPS subscription URL', () => {
  const subscriptionUrl = 'https://access.test/sub/fixture?token=test-only'
  assert.deepEqual(getDeviceConnection('incy', { subscription: { active: true }, access: { subscriptionUrl } }), { type: 'open', href: `incy://import/${subscriptionUrl}` })
})

test('subscription URL validation preserves the issued HTTPS URL for copying', () => {
  const subscriptionUrl = 'https://access.test/sub/fixture?token=value%2Bsecret'
  assert.equal(getSubscriptionUrl({ subscriptionUrl }), subscriptionUrl)
  assert.equal(getSubscriptionUrl(), null)
  assert.equal(getSubscriptionUrl({ happDeepLink: 'happ://supplied-link' }), null)
})

test('Happ uses the explicit supplied link unchanged and never builds one from a subscription URL', () => {
  const model = { subscription: { active: true }, access: { subscriptionUrl: 'https://access.test/sub' } }
  assert.deepEqual(getDeviceConnection('happ', model), { type: 'unavailable' })
  // This fixture is an opaque supplied URI, not an invented import contract.
  for (const happDeepLink of ['happ://supplied-link', 'https://access.test/supplied-happ-link']) {
    assert.deepEqual(getDeviceConnection('happ', { ...model, access: { happDeepLink } }), { type: 'open', href: happDeepLink })
  }
})

test('missing and unsafe access fields cannot launch an external client or script', () => {
  for (const value of [null, '', ' ', 1, '//access.test/sub', 'javascript:alert(1)', 'data:text/plain,test', 'http://access.test/sub', 'https://user:password@access.test/sub', 'https://access.test/\nsub', 'https://access.test/\\sub']) {
    assert.equal(getSubscriptionUrl({ subscriptionUrl: value }), null)
    for (const client of ['happ', 'incy']) assert.deepEqual(getDeviceConnection(client, {
      subscription: { active: true }, access: { subscriptionUrl: value, happDeepLink: value },
    }), { type: 'unavailable' })
  }
  assert.deepEqual(getDeviceConnection('unknown', dashboardMock), { type: 'unavailable' })
})
