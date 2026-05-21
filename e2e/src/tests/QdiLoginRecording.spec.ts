import { test } from '@playwright/test';

// Purpose:
// - Run this test while using Playwright Inspector / Codegen style recording.
// - Paste or refine the generated step sequence inside the marked block.
// - Once stable, we will move the finalized flow into AgencyForm.page.ts login helpers.

test('Record QDI login steps', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  const rootUrl = process.env.DTP_ROOT_URL || 'https://forms.preprod.beta.my.qld.gov.au';
  const agencyFormUrl = `${rootUrl}/companioncardapply/agency-form`;

  await page.goto(agencyFormUrl, { waitUntil: 'domcontentloaded' });

  // Pause immediately so you can use Inspector/codegen to capture steps.
  await page.pause();

  // -----------------------
  // RECORDING BLOCK START
  // -----------------------
  // Paste recorded QDI login actions below, for example:
  // await page.getByRole('button', { name: /continue with qdi|continue with qgov ?id/i }).click();
  // await page.getByRole('button', { name: /select qdi|select qgov ?id/i }).click();
  // await page.getByRole('textbox', { name: /email/i }).fill('ictassurance+qdi11@smartservice.qld.gov.au');
  // await page.getByRole('button', { name: /get code/i }).click();
  // ... OTP / consent flow ...
  // ---------------------
  // RECORDING BLOCK END
  // ---------------------

  // Keep browser open at the end while validating selectors during recording.
  await page.waitForTimeout(5000);
});
