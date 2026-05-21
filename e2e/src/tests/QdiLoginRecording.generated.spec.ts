import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  const qdiEmail = process.env.E2E_LOGIN_EMAIL || 'ictassurance+qdi20@smartservice.qld.gov.au';
  const qdiPassword = process.env.E2E_QDI_PASSWORD || '';
  const qdiOtpCode = process.env.E2E_QDI_OTP_CODE || '';

  await page.goto('https://www.preprod.auth.qld.gov.au/auth/realms/tell-us-once/protocol/openid-connect/auth?client_id=dtp-queenslandonline-companioncardapply&redirect_uri=https%3A%2F%2Fforms.preprod.beta.my.qld.gov.au%2Fcompanioncardapply%2Fredirect&state=f2fd5c04-6450-470e-837b-843f336c11b1&response_mode=fragment&response_type=code&scope=openid&nonce=3fd503c6-8fd7-4f80-ac31-aac26fc42190&claims=%7B%22id_token%22%3A%7B%22acr%22%3A%7B%22essential%22%3Afalse%2C%22values%22%3A%5B%22urn%3Aid.gov.au%3Atdif%3Aacr%3Aip1%3Acl1%22%2C%22urn%3Aid.gov.au%3Atdif%3Aacr%3Aip1%3Acl2%22%2C%22urn%3Aid.gov.au%3Atdif%3Aacr%3Aip1%3Acl3%22%2C%22urn%3Aid.gov.au%3Atdif%3Aacr%3Aip2%3Acl2%22%2C%22urn%3Aid.gov.au%3Atdif%3Aacr%3Aip2%3Acl3%22%5D%7D%7D%7D&code_challenge=V5UdDPA5W3LFN7anuW1O03ESk-kpPa_fYkswxkITk9E&code_challenge_method=S256');
  await page.getByRole('button', { name: 'Continue with Queensland' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(qdiEmail);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(qdiPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Enter your one-time code' }).click();
  await page.getByRole('textbox', { name: 'Enter your one-time code' }).fill(qdiOtpCode);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Remind me later' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Start new' }).click();
});