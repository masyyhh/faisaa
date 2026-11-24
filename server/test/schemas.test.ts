import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  recurringTransactionSchema,
  billSchema,
  forgotPasswordRequestSchema,
  resetPasswordConfirmSchema,
} from '../src/validators/schemas.js';

describe('Validation Schemas (schemas.ts)', () => {
  test('recurringTransactionSchema accepts BIWEEKLY and QUARTERLY frequencies', () => {
    const biweeklyPayload = {
      accountId: 'acc-123',
      type: 'EXPENSE',
      amount: 1500,
      payee: 'Cleaning Service',
      frequency: 'BIWEEKLY',
      startDate: '2026-03-01',
    };
    const parsedBiweekly = recurringTransactionSchema.parse(biweeklyPayload);
    assert.equal(parsedBiweekly.frequency, 'BIWEEKLY');

    const quarterlyPayload = {
      accountId: 'acc-123',
      type: 'EXPENSE',
      amount: 4500,
      payee: 'Insurance Premium',
      frequency: 'QUARTERLY',
      startDate: '2026-03-01',
    };
    const parsedQuarterly = recurringTransactionSchema.parse(quarterlyPayload);
    assert.equal(parsedQuarterly.frequency, 'QUARTERLY');
  });

  test('recurringTransactionSchema rejects negative or zero amounts', () => {
    assert.throws(() => {
      recurringTransactionSchema.parse({
        accountId: 'acc-123',
        type: 'EXPENSE',
        amount: -50,
        payee: 'Test',
        frequency: 'MONTHLY',
        startDate: '2026-03-01',
      });
    });
  });

  test('billSchema parses valid bills with reminder days', () => {
    const bill = billSchema.parse({
      name: 'Internet Bill',
      amount: 850,
      dueDate: '2026-03-25',
      frequency: 'MONTHLY',
    });
    assert.equal(bill.name, 'Internet Bill');
    assert.equal(bill.reminderDays, 3);
  });

  test('forgotPasswordRequestSchema requires identifier', () => {
    assert.throws(() => {
      forgotPasswordRequestSchema.parse({ identifier: '' });
    });
  });

  test('resetPasswordConfirmSchema validates 6-digit code format and password strength', () => {
    const valid = resetPasswordConfirmSchema.parse({
      identifier: 'alex@faisaa.online',
      code: '123456',
      newPassword: 'StrongPassword123!',
    });
    assert.equal(valid.code, '123456');

    // Code must be 6 digits
    assert.throws(() => {
      resetPasswordConfirmSchema.parse({
        identifier: 'alex@faisaa.online',
        code: '123',
        newPassword: 'StrongPassword123!',
      });
    });

    // Password must meet complexity requirements
    assert.throws(() => {
      resetPasswordConfirmSchema.parse({
        identifier: 'alex@faisaa.online',
        code: '123456',
        newPassword: 'short',
      });
    });
  });
});
