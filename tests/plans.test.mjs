// Run: node --test tests/plans.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { billingPeriods, plansMock } from '../src/data/plansMock.js'
import { calculatePlanPrice } from '../src/lib/plansPricing.js'

test('the catalogue contains exactly the requested prices, devices and bypass allowances', () => {
  assert.deepEqual(plansMock, [
    { id: 'basic', name: 'Basic', devices: 2, bypassGb: 50, monthlyPrice: 299 },
    { id: 'plus', name: 'Plus', devices: 5, bypassGb: 75, monthlyPrice: 599 },
    { id: 'pro-plus', name: 'Pro Plus', devices: 10, bypassGb: 100, monthlyPrice: 999 },
  ])
})

test('1, 6 and 12 months have exactly 0%, 10% and 20% discounts', () => {
  assert.deepEqual(billingPeriods, [
    { months: 1, discount: 0 }, { months: 6, discount: 0.1 }, { months: 12, discount: 0.2 },
  ])
})

for (const [name, base, expected] of [
  ['Basic', 299, [[1, 299, 299], [6, 1615, 269], [12, 2870, 239]]],
  ['Plus', 599, [[1, 599, 599], [6, 3235, 539], [12, 5750, 479]]],
  ['Pro Plus', 999, [[1, 999, 999], [6, 5395, 899], [12, 9590, 799]]],
]) {
  test(`${name}: correct whole-ruble totals and approximate monthly prices for every period`, () => {
    for (const [months, total, effectiveMonthly] of expected) {
      assert.deepEqual(calculatePlanPrice(base, months), { total, effectiveMonthly })
    }
  })
}

test('the default period has no discount and a free base price remains zero', () => {
  assert.deepEqual(calculatePlanPrice(299), { total: 299, effectiveMonthly: 299 })
  for (const { months } of billingPeriods) {
    assert.deepEqual(calculatePlanPrice(0, months), { total: 0, effectiveMonthly: 0 })
  }
})

test('rounds the final total, rather than multiplying a rounded monthly price', () => {
  assert.equal(calculatePlanPrice(299, 6).total, 1615) // Not 269 × 6 = 1614.
  assert.equal(calculatePlanPrice(2.5, 6).total, 14) // 13.5 rounds up.
  assert.equal(calculatePlanPrice(299, 12).total, 2870) // 2870.4 rounds down.
})

test('effective monthly price derives from the authoritative rounded total', () => {
  assert.deepEqual(calculatePlanPrice(2.75, 6), { total: 15, effectiveMonthly: 3 })
})

test('repeated period changes do not mutate base plans or billing periods', () => {
  const before = structuredClone({ plansMock, billingPeriods })
  for (const plan of plansMock) for (const months of [1, 6, 12, 6, 1]) calculatePlanPrice(plan.monthlyPrice, months)
  assert.deepEqual({ plansMock, billingPeriods }, before)
})

test('unexpected periods cannot produce an invented discount or NaN price', () => {
  for (const period of [0, 3, -6, 6.5, '6', null, NaN, Infinity, {}]) {
    assert.throws(() => calculatePlanPrice(299, period), RangeError)
  }
})

test('invalid or overflowing base prices fail explicitly', () => {
  for (const base of [-1, NaN, Infinity, '299', null, undefined, Number.MAX_VALUE]) {
    assert.throws(() => calculatePlanPrice(base, 12), RangeError)
  }
})
