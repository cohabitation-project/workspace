import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as cred from '../credentials.mjs';

describe('credentials', () => {
  describe('generateEnrollmentCode', () => {
    it('produces a code with the correct prefix', () => {
      const { code } = cred.generateEnrollmentCode();
      assert.ok(code.startsWith('adin_enroll_'));
    });

    it('produces unique codes', () => {
      const a = cred.generateEnrollmentCode();
      const b = cred.generateEnrollmentCode();
      assert.notEqual(a.code, b.code);
      assert.notEqual(a.code_hash, b.code_hash);
    });

    it('sets expiry in the future', () => {
      const { expires_at } = cred.generateEnrollmentCode();
      assert.ok(expires_at > Date.now());
    });
  });

  describe('generateNodeSecret', () => {
    it('produces a secret with the correct prefix', () => {
      const { secret } = cred.generateNodeSecret();
      assert.ok(secret.startsWith('adin_ns_'));
    });

    it('sets rotation date 90 days out', () => {
      const { issued_at, rotate_by } = cred.generateNodeSecret();
      const diff = rotate_by - issued_at;
      const days = diff / (24 * 60 * 60 * 1000);
      assert.ok(days >= 89.9 && days <= 90.1);
    });
  });

  describe('generateSessionToken', () => {
    it('produces a token with the correct prefix', () => {
      const { token } = cred.generateSessionToken();
      assert.ok(token.startsWith('adin_st_'));
    });

    it('expires in about 1 hour', () => {
      const { expires_at } = cred.generateSessionToken();
      const diff = expires_at - Date.now();
      assert.ok(diff > 59 * 60 * 1000 && diff <= 60 * 60 * 1000);
    });
  });

  describe('verify', () => {
    it('returns true for matching secret and hash', () => {
      const { secret, secret_hash } = cred.generateNodeSecret();
      assert.ok(cred.verify(secret, secret_hash));
    });

    it('returns false for wrong secret', () => {
      const { secret_hash } = cred.generateNodeSecret();
      assert.ok(!cred.verify('wrong_secret', secret_hash));
    });

    it('returns false for null inputs', () => {
      assert.ok(!cred.verify(null, null));
      assert.ok(!cred.verify('test', null));
      assert.ok(!cred.verify(null, 'test'));
    });
  });

  describe('isExpired', () => {
    it('returns false for future timestamp', () => {
      assert.ok(!cred.isExpired(Date.now() + 60000));
    });

    it('returns true for past timestamp', () => {
      assert.ok(cred.isExpired(Date.now() - 1));
    });
  });

  describe('needsRotation', () => {
    it('returns false when rotate_by is far in the future', () => {
      assert.ok(!cred.needsRotation(Date.now() + 30 * 24 * 60 * 60 * 1000));
    });

    it('returns true when within 7-day warning window', () => {
      assert.ok(cred.needsRotation(Date.now() + 3 * 24 * 60 * 60 * 1000));
    });
  });

  describe('inGracePeriod', () => {
    it('returns true within 5 minutes of rotation', () => {
      assert.ok(cred.inGracePeriod(Date.now() - 60_000)); // 1 min ago
    });

    it('returns false after 5 minutes', () => {
      assert.ok(!cred.inGracePeriod(Date.now() - 6 * 60_000)); // 6 min ago
    });
  });
});
