import { test, expect } from 'vitest'
import { centsToDollars, dollarsToCents } from '../src/lib/money.js'

test('money conversions', () => {
  expect(centsToDollars(12345)).toBe('123.45')
  expect(dollarsToCents('123.45')).toBe(12345)
  expect(dollarsToCents('-1.50')).toBe(-150)
})
