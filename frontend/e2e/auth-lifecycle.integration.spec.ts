import { test, expect, APIRequestContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

const enabled = process.env.E2E_AUTH_LIFECYCLE === 'true';
function totp(secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const char of secret.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((chunk) => parseInt(chunk, 2)));
  const counter = Math.floor(now / 30000); const input = Buffer.alloc(8); input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', bytes).update(input).digest(); const offset = digest[digest.length - 1] & 15;
  const value = ((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(value % 1000000).padStart(6, '0');
}
test.describe('real auth lifecycle (PostgreSQL + Redis + Mailpit)', () => {
  test.skip(!enabled, 'Set E2E_AUTH_LIFECYCLE=true with the compose stack running');

  async function csrf(request: APIRequestContext) {
    const response = await request.get('/api/auth/csrf');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body?.data?.token ?? body?.token;
  }

  async function latestMailpitCode(email: string): Promise<string> {
    const base = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
    const list = await fetch(`${base}/api/v1/search?query=to:${encodeURIComponent(email)}`);
    if (!list.ok) throw new Error(`Mailpit unavailable: ${list.status}`);
    const messages = await list.json() as { messages?: Array<{ ID: string }> };
    const id = messages.messages?.[0]?.ID;
    if (!id) throw new Error('No verification email received');
    const message = await (await fetch(`${base}/api/v1/message/${id}`)).json() as { Text?: string; HTML?: string };
    const text = `${message.Text ?? ''} ${message.HTML ?? ''}`;
    const code = text.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error('No six-digit verification code in Mailpit');
    return code;
  }

  test('registers, verifies email, enrolls MFA, resets password and schedules deletion', async ({ request }) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-${suffix}@example.test`;
    const password = 'E2ePassword!123';
    const csrfToken = await csrf(request);
    const headers = { 'X-CSRF-Token': csrfToken, 'X-Device-Signal': `e2e-${suffix}` };

    const registration = await request.post('/api/auth/register', { headers, data: {
      firstName: 'E2E', lastName: 'Lifecycle', email, password,
      username: `e2e${suffix.replace(/\D/g, '').slice(-10)}`, phone: '+201000000001', role: 'STUDENT',
      consents: { termsAccepted: true, termsVersion: 'e2e', privacyAccepted: true, privacyVersion: 'e2e', acceptedAt: new Date().toISOString() },
    }});
    expect(registration.ok()).toBeTruthy();

    const verificationCode = await latestMailpitCode(email);
    const loginBeforeVerification = await request.post('/api/auth/login', { headers, data: { email, password } });
    expect(loginBeforeVerification.ok()).toBeTruthy();

    const verify = await request.post('/api/auth/verify-email', { headers, data: { code: verificationCode } });
    expect(verify.ok()).toBeTruthy();

    const mfaSetup = await request.post('/api/auth/mfa/setup', { headers });
    expect(mfaSetup.ok()).toBeTruthy();
    const mfaPayload = await mfaSetup.json();
    const secret = mfaPayload.data?.secret ?? mfaPayload.secret;
    expect(secret).toBeTruthy();
    const mfaEnable = await request.post('/api/auth/mfa/enable', { headers, data: { code: totp(secret) } });
    expect(mfaEnable.ok()).toBeTruthy();

    const forgot = await request.post('/api/auth/forgot-password', { headers, data: { email } });
    expect(forgot.ok()).toBeTruthy();
    expect((await forgot.json()).message ?? '').not.toContain(email);

    const resetCode = await latestMailpitCode(email);
    const resetVerify = await request.post('/api/auth/forgot-password/verify-code', { headers, data: { email, code: resetCode } });
    expect(resetVerify.ok()).toBeTruthy();
    const reset = await request.post('/api/auth/reset-password', { headers, data: { newPassword: 'E2ePassword!456' } });
    expect(reset.ok()).toBeTruthy();

    const loginAfterReset = await request.post('/api/auth/login', { headers, data: { email, password: 'E2ePassword!456', rememberMe: false } });
    expect(loginAfterReset.ok()).toBeTruthy();
    const recentAuth = await request.post('/api/auth/reauthenticate', { headers, data: { password: 'E2ePassword!456' } });
    expect(recentAuth.ok()).toBeTruthy();
    const deletion = await request.delete('/api/auth/account', { headers, data: { password: 'E2ePassword!456', reason: 'e2e cleanup' } });
    expect(deletion.ok()).toBeTruthy();
  });
});
