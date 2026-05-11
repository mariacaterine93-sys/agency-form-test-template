import { test, expect } from '@playwright/test';
import { AgencyFormPage } from '../pages/CC Apply/AgencyForm.page';
import { BeforeYouStartPage } from '../pages/CC Apply/BeforeYouStart.page';
import { getMyIdEmail } from './test-data/centralizedTestData';

/**
 * BYS Mandatory Check
 * Verifies that the Before You Start page enforces mandatory field/option selection
 * before allowing the user to proceed.
 */
test('BYS: mandatory selection required before proceeding', async ({ page }, testInfo) => {
  test.setTimeout(180000);

  const agencyFormPage = new AgencyFormPage(page);
  const beforeYouStartPage = new BeforeYouStartPage(page);
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();

  // If saved auth already lands on Before You Start, reuse it. Otherwise run the full auth flow.
  await agencyFormPage.goToCompanionCardApply();
  await agencyFormPage.ensureNoLoadingError();
  const alreadyOnBys = await bysHeading.isVisible({ timeout: 8000 }).catch(() => false);
  const draftDialogVisible = alreadyOnBys
    ? false
    : await beforeYouStartPage.draftDialog
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

  if (!alreadyOnBys && !draftDialogVisible) {
    const beginVisible = await agencyFormPage.beginButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (beginVisible) {
      await agencyFormPage.beginApplication();
    }

    // Some runs land directly on BYS (with draft modal) right after Begin when auth is already valid.
    const reachedBysAfterBegin = await bysHeading.isVisible({ timeout: 5000 }).catch(() => false);
    const draftVisibleAfterBegin = reachedBysAfterBegin
      ? false
      : await beforeYouStartPage.draftDialog
          .waitFor({ state: 'visible', timeout: 3000 })
          .then(() => true)
          .catch(() => false);

    if (!reachedBysAfterBegin && !draftVisibleAfterBegin) {
      const continueWithMyIdVisible = await agencyFormPage.continueWithMyIdButton.isVisible({ timeout: 10000 }).catch(() => false);
      if (continueWithMyIdVisible) {
        await agencyFormPage.continueWithMyId();
      }

      const selectMyIdVisible = await agencyFormPage.selectMyIdButton.isVisible({ timeout: 10000 }).catch(() => false);
      if (selectMyIdVisible) {
        await agencyFormPage.selectMyId();
      }

      const emailVisible = await agencyFormPage.myIdEmailTextBox.isVisible({ timeout: 15000 }).catch(() => false);
      if (emailVisible) {
        await agencyFormPage.enterMyIdEmail(getMyIdEmail('BYSMandatoryCheck.spec.ts'));
        await agencyFormPage.consentIfRequired();
      }

      await agencyFormPage.navigateToAgencyFormIfNeeded();
    }

    await agencyFormPage.ensureNoLoadingError();
  }

  const runMandatoryCheck = async () => {
    await beforeYouStartPage.startNewIfDraftExists();

    await expect(page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first()).toBeVisible({ timeout: 60000 });

    // Attempt to proceed WITHOUT selecting a card type option.
    await beforeYouStartPage.clickSaveAndContinue();

    try {
      // --- Condition 1: Page did not navigate forward ---
      await expect(page).toHaveURL(/\/companioncardapply\/agency-form(?:\?.*)?$/);
      await expect(page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: /contact details/i })).not.toBeVisible();

      // --- Condition 2: Error summary banner is displayed ---
      const errorBanner = page.getByRole('heading', { name: /please review the following errors/i });
      await expect(errorBanner).toBeVisible({ timeout: 10000 });
      await expect(errorBanner).toHaveText('Please review the following errors');
      await expect(page.getByText('Complete all required fields to continue')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Before you start: What are you trying to do?' })).toBeVisible();

      // --- Condition 3: Inline red error message is shown ---
      const inlineError = page.getByText(/what are you trying to do\? is required/i);
      await expect(inlineError).toBeVisible({ timeout: 5000 });
      await expect(inlineError).toHaveText('What are you trying to do? is required');
      await expect(inlineError).toHaveCSS('color', 'rgb(226, 35, 57)');

      testInfo.annotations.push({ type: 'result', description: 'Test Pass - Conditions are met' });
      console.log('✅ Test Pass - Conditions are met');
    } catch {
      await page.screenshot({
        path: testInfo.outputPath('screenshots/bys-error-message-screen.png'),
        fullPage: true,
      });
      throw new Error('Test Fail - Conditions are not met');
    }
  };

  let attempts = 0;
  while (true) {
    try {
      await runMandatoryCheck();
      break;
    } catch (error: any) {
      if (error.message === 'DraftDeleted' && attempts < 2) {
        attempts++;
        console.log(`Draft deleted, restarting BYS check (attempt ${attempts})...`);
        continue;
      }
      throw error;
    }
  }

  await page.screenshot({
    path: testInfo.outputPath('screenshots/bys-final-screen.png'),
    fullPage: true,
  });
});

