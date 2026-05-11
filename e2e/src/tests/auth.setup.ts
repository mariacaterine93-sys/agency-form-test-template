import { test as setup, expect } from '@playwright/test';
import { AgencyFormPage } from '../pages/CC Apply/AgencyForm.page';
import * as fs from 'fs';

const authFile = 'playwright/.auth/user.json';
setup.setTimeout(600000);

setup('authenticate and save storage state', async ({ page }) => {
  const agencyFormPage = new AgencyFormPage(page);
  const email = 'IndustryRDTI27@test.gov.au';
  const agencyFormUrl = 'https://forms.preprod.beta.my.qld.gov.au/companioncardapply/agency-form';
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();

  // If a stored session already exists, try reusing it first.
  if (fs.existsSync(authFile)) {
    const browser = page.context().browser();
    if (browser) {
      const existingSessionContext = await browser.newContext({ storageState: authFile });
      const existingSessionPage = await existingSessionContext.newPage();

      try {
        await existingSessionPage.goto(agencyFormUrl, { waitUntil: 'networkidle' });
        const existingSessionBysHeading = existingSessionPage
          .getByRole('heading', { name: /before you start|what are you trying to do\?/i })
          .first();
        const sessionStillValid = await existingSessionBysHeading.isVisible({ timeout: 8000 }).catch(() => false);

        if (sessionStillValid) {
          console.log('Existing session is still valid. Re-saving storage state.');
          await existingSessionContext.storageState({ path: authFile });
          await existingSessionContext.close();
          return;
        }
      } finally {
        await existingSessionContext.close().catch(() => {});
      }
    }

    console.log('Session expired. Running full login flow...');
  }

  // Full login flow.
  await agencyFormPage.goToCompanionCardApply();
  await agencyFormPage.ensureNoLoadingError();
  await agencyFormPage.beginApplication();
  await agencyFormPage.continueWithMyId();
  await agencyFormPage.selectMyId();
  await agencyFormPage.enterMyIdEmail(email);
  await agencyFormPage.consentIfRequired();
  await agencyFormPage.navigateToAgencyFormIfNeeded().catch(() => {});

  const reachedBysAutomatically = await bysHeading.isVisible({ timeout: 8000 }).catch(() => false);
  if (!reachedBysAutomatically) {
    console.log('ACTION REQUIRED: Please complete login in the browser to reach Before you start.');
  }

  await expect(bysHeading).toBeVisible({ timeout: 480000 });
  await page.context().storageState({ path: authFile });
});
