// Run: node --test tests/dashboard-header.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialHeaderScroll, nextHeaderScroll } from '../src/lib/dashboardHeader.js'

test('header starts visible and hides only after intentional downward scrolling', () => {
  let state = initialHeaderScroll()
  assert.equal(state.hidden, false)
  state = nextHeaderScroll(state, 63)
  assert.equal(state.hidden, false)
  state = nextHeaderScroll(state, 64)
  assert.equal(state.hidden, true)
})

test('a direction change needs 16px down or 12px up, without returning to the top', () => {
  let state = nextHeaderScroll(initialHeaderScroll(), 200)
  state = nextHeaderScroll(state, 189)
  assert.equal(state.hidden, true)
  state = nextHeaderScroll(state, 188)
  assert.equal(state.hidden, false)
  state = nextHeaderScroll(state, 203)
  assert.equal(state.hidden, false)
  state = nextHeaderScroll(state, 204)
  assert.equal(state.hidden, true)
})

test('one-pixel oscillations do not toggle either state', () => {
  for (const hidden of [false, true]) {
    let state = { ...initialHeaderScroll(200), hidden }
    for (let i = 0; i < 100; i++) {
      state = nextHeaderScroll(state, i % 2 ? 200 : 201)
      assert.equal(state.hidden, hidden)
    }
  }
})

test('small movements accumulate when the direction stays intentional', () => {
  let state = initialHeaderScroll(100)
  for (let y = 101; y < 116; y++) {
    state = nextHeaderScroll(state, y)
    assert.equal(state.hidden, false)
  }
  assert.equal(nextHeaderScroll(state, 116).hidden, true)
})

test('near the top always restores the header and negative bounce is clamped', () => {
  const hidden = { ...initialHeaderScroll(25), hidden: true }
  assert.equal(nextHeaderScroll(hidden, 24).hidden, false)
  assert.deepEqual(nextHeaderScroll(hidden, -20), initialHeaderScroll())
})

test('mounting at a restored scroll position starts visible without an immediate hide', () => {
  const state = initialHeaderScroll(500)
  assert.equal(nextHeaderScroll(state, 500), state)
  assert.equal(nextHeaderScroll(state, 501).hidden, false)
  assert.equal(nextHeaderScroll(state, 516).hidden, true)
})
