import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  generateSecureOtp,
  hashToken,
  encrypt,
  decrypt,
  isEncrypted,
  generateSecureToken,
} from '../src/utils/crypto.js';

describe('Cryptographic Utilities (crypto.ts)', () => {
  test('generateSecureOtp generates cryptographically secure 6-digit numeric codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const code = generateSecureOtp(6);
      assert.equal(code.length, 6, 'OTP must be exactly 6 digits');
      assert.match(code, /^\d{6}$/, 'OTP must be all numeric digits');
      codes.add(code);
    }
    // With 500 codes, uniqueness should be high (> 480)
    assert.ok(codes.size > 480, `Expected high entropy across 500 OTPs, got ${codes.size}`);
  });

  test('hashToken produces 64-character hex SHA-256 string', () => {
    const raw = '123456';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);
    assert.equal(hash1.length, 64);
    assert.equal(hash1, hash2, 'SHA-256 hash must be deterministic');

    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    assert.equal(hash1, expected);
  });

  test('timing-safe equality prevents timing attacks on OTP hashes', () => {
    const raw = '654321';
    const hashExpected = hashToken(raw);
    const hashInputCorrect = hashToken(raw);
    const hashInputWrong = hashToken('111111');

    const bufExpected = Buffer.from(hashExpected);
    const bufCorrect = Buffer.from(hashInputCorrect);
    const bufWrong = Buffer.from(hashInputWrong);

    assert.equal(
      bufExpected.length === bufCorrect.length && crypto.timingSafeEqual(bufExpected, bufCorrect),
      true
    );
    assert.equal(
      bufExpected.length === bufWrong.length && crypto.timingSafeEqual(bufExpected, bufWrong),
      false
    );
  });

  test('encrypt and decrypt round-trip AES-256-GCM successfully', () => {
    // Set dummy test encryption key if not in env
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }

    const secretText = 'sensitive-telegram-bot-token-12345';
    const encrypted = encrypt(secretText);

    assert.ok(encrypted);
    assert.ok(isEncrypted(encrypted), 'Encrypted text should match iv:authTag:ciphertext pattern');

    const decrypted = decrypt(encrypted);
    assert.equal(decrypted, secretText, 'Decrypted text must match original secret');
  });

  test('generateSecureToken generates hex tokens of expected length', () => {
    const token = generateSecureToken(32);
    assert.equal(token.length, 64, '32 bytes in hex must be 64 characters');
    assert.match(token, /^[0-9a-f]{64}$/);
  });
});
