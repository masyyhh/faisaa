import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { advanceNextOccurrence } from '../src/services/recurringEngine.js';

describe('Recurring Engine Scheduling (recurringEngine.ts)', () => {
  const base = new Date('2026-03-01T00:00:00.000Z');

  test('advanceNextOccurrence advances DAILY by 1 day', () => {
    const next = advanceNextOccurrence(base, 'DAILY');
    const diff = Math.round((next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diff, 1);
  });

  test('advanceNextOccurrence advances WEEKLY by 7 days', () => {
    const next = advanceNextOccurrence(base, 'WEEKLY');
    const diff = Math.round((next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diff, 7);
  });

  test('advanceNextOccurrence advances BIWEEKLY by 14 days', () => {
    const next = advanceNextOccurrence(base, 'BIWEEKLY');
    const diff = Math.round((next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diff, 14);
  });

  test('advanceNextOccurrence advances MONTHLY by 1 calendar month', () => {
    const next = advanceNextOccurrence(base, 'MONTHLY');
    assert.equal(next.getUTCMonth(), 3, 'Expected April (index 3)');
  });

  test('advanceNextOccurrence advances QUARTERLY by 3 calendar months', () => {
    const next = advanceNextOccurrence(base, 'QUARTERLY');
    assert.equal(next.getUTCMonth(), 5, 'Expected June (index 5)');
  });

  test('advanceNextOccurrence advances YEARLY by 1 calendar year', () => {
    const next = advanceNextOccurrence(base, 'YEARLY');
    assert.equal(next.getUTCFullYear(), 2027);
  });
});
