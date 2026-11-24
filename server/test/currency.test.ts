import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  toMVR,
  toUSD,
  DEFAULT_USD_TO_MVR_RATE,
} from '../src/utils/currency.js';

describe('Currency Conversion Utilities (currency.ts)', () => {
  test('DEFAULT_USD_TO_MVR_RATE equals 15.42', () => {
    assert.equal(DEFAULT_USD_TO_MVR_RATE, 15.42);
  });

  test('toMVR converts USD to MVR with custom rate correctly', () => {
    const usdAmount = 100;
    const rate = 18.45;
    const mvr = toMVR(usdAmount, 'USD', rate);
    assert.equal(mvr, 1845.0);
  });

  test('toMVR converts USD to MVR with default rate (15.42) when rate omitted', () => {
    const usdAmount = 50;
    const mvr = toMVR(usdAmount, 'USD');
    assert.equal(mvr, 771.0);
  });

  test('toMVR returns MVR amounts directly without conversion', () => {
    const amount = 350.75;
    assert.equal(toMVR(amount, 'MVR', 18.45), 350.75);
  });

  test('toUSD converts MVR to USD accurately', () => {
    const mvrAmount = 1542;
    const usd = toUSD(mvrAmount, 'MVR', 15.42);
    assert.equal(usd, 100.0);
  });

  test('toUSD handles zero rate gracefully', () => {
    assert.equal(toUSD(100, 'MVR', 0), 0);
  });
});
