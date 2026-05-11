import { test, expect } from '@playwright/test';
import { AgencyFormPage } from '../pages/CC Apply/AgencyForm.page';
import { BeforeYouStartPage } from '../pages/CC Apply/BeforeYouStart.page';
import { getMyIdEmail } from './test-data/centralizedTestData';
import { environment } from './config/environment';

const failValidation = (num: number): never => {
  throw new Error(`Validation ${num} - Fail`);
};

test('Applicant NS', async ({ page }, testInfo) => {
  test.setTimeout(240000);

  const agencyFormPage = new AgencyFormPage(page);
  const beforeYouStartPage = new BeforeYouStartPage(page);
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();
  const contactDetailsHeading = page.getByRole('heading', { name: /contact details/i });
  const myIdEmail = getMyIdEmail('ApplicantNS.spec.ts');
  const agencyFormUrl = `${process.env.DTP_ROOT_URL || 'https://forms.preprod.beta.my.qld.gov.au'}/companioncardapply/agency-form`;

  const handleDraftFailedModal = async () => {
    const draftFailedHeading = page.getByRole('heading', { name: /your draft failed to load/i });
    const visible = await draftFailedHeading.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) return false;

    const backToStart = page.getByRole('button', { name: /back to start/i });
    await backToStart.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await draftFailedHeading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    return true;
  };

  const recoverAuthIfNeeded = async (): Promise<boolean> => {
    const loginHeading = page.getByRole('heading', { name: /login to continue/i });
    const loginVisible = await loginHeading.isVisible({ timeout: 5000 }).catch(() => false);
    if (!loginVisible) {
      return false;
    }

    if (await agencyFormPage.continueWithMyIdButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await agencyFormPage.continueWithMyId();
    }

    if (await agencyFormPage.selectMyIdButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await agencyFormPage.selectMyId();
    }

    if (await agencyFormPage.myIdEmailTextBox.isVisible({ timeout: 12000 }).catch(() => false)) {
      await agencyFormPage.enterMyIdEmail(myIdEmail);
    }

    await agencyFormPage.consentIfRequired();

    try {
      await agencyFormPage.navigateToAgencyFormIfNeeded();
      await agencyFormPage.ensureNoLoadingError();
      return true;
    } catch {
      await page.goto(agencyFormUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await agencyFormPage.ensureNoLoadingError().catch(() => {});
      const bysNowVisible = await bysHeading.isVisible({ timeout: 10000 }).catch(() => false);
      const draftNowVisible = await beforeYouStartPage.draftDialog.isVisible().catch(() => false);
      return bysNowVisible || draftNowVisible;
    }
  };

  const goFromBysToContactDetails = async () => {
    await handleDraftFailedModal();
    await beforeYouStartPage.startNewIfDraftExists();
    await handleDraftFailedModal();
    await beforeYouStartPage.selectApplyForNewCard();
    await beforeYouStartPage.clickSaveAndContinue();
    await handleDraftFailedModal();
  };

  // Stable auth entry: rely on saved storage state, no in-test login flow.
  await page.goto(agencyFormUrl, { waitUntil: 'domcontentloaded' });
  await agencyFormPage.ensureNoLoadingError();
  await handleDraftFailedModal();

  await recoverAuthIfNeeded();
  await handleDraftFailedModal();

  await beforeYouStartPage.startNewIfDraftExists();
  await handleDraftFailedModal();
  const bysVisible = await bysHeading.isVisible({ timeout: 20000 }).catch(() => false);
  if (!bysVisible) {
    throw new Error(
      'Auth session is not valid for ApplicantNS. Run auth setup first: npx playwright test tests/auth.setup.ts --project=setup --headed'
    );
  }

  // BYS: Apply for a new Card -> Save & Continue
  await goFromBysToContactDetails();

  // If app bounced to login, recover auth and retry once from BYS.
  const onContactDetails = await contactDetailsHeading.isVisible({ timeout: 8000 }).catch(() => false);
  if (!onContactDetails) {
    const recovered = await recoverAuthIfNeeded();
    if (recovered) {
      await goFromBysToContactDetails();
    }
  }

  await handleDraftFailedModal();
  await expect(contactDetailsHeading).toBeVisible({ timeout: 60000 });

  // Select "Myself..." and minimal fill to proceed to Applicant Details.
  const option1 = page.getByRole('radio', { name: /Myself, the person with a disability/i }).first();
  await option1.check().catch(async () => option1.click());

  const firstName = page.getByRole('textbox', { name: /^First name\b/i }).first();
  const lastName = page.getByRole('textbox', { name: /^Last name\b/i }).first();
  const email = page.getByRole('textbox', { name: /^Email address\b|^Email\b/i }).first();
  const phone = page.getByRole('textbox', { name: /^Phone number\b|^Mobile phone number\b/i }).first();

  await firstName.waitFor({ state: 'visible', timeout: 15000 });
  await firstName.fill('Test');
  await lastName.fill('User');
  await email.fill('test@example.com');
  await phone.fill('0401234567');

  const preferredEmail = page.getByRole('radio', { name: /^Email$/i }).first();
  await preferredEmail.check().catch(async () => preferredEmail.click());

  // Click Save & Continue to proceed to Applicant Details.
  await agencyFormPage.clickSaveAndContinue();

  const applicantDetailsHeading = page.getByRole('heading', { name: /applicant details/i }).first();
  await expect(applicantDetailsHeading).toBeVisible({ timeout: 60000 });

  // Validation 1: Validate default landing page content on Applicant Details screen.
  const permanentResidentQuestion = page.getByText(/is the person with a disability a permanent resident of queensland\?/i);
  if (!(await permanentResidentQuestion.isVisible({ timeout: 15000 }).catch(() => false))) {
    failValidation(1);
  }

  const permanentResidentDescription = page.getByText(/a permanent resident of queensland is someone who lives in queensland for more than 6 months of the year/i);
  if (!(await permanentResidentDescription.isVisible({ timeout: 5000 }).catch(() => false))) {
    failValidation(1);
  }

  const yesOption = page.getByRole('radio', { name: /^Yes$/i }).first();
  const noOption = page.getByRole('radio', { name: /^No$/i }).first();
  if (!(await yesOption.isVisible({ timeout: 5000 }).catch(() => false)) || !(await noOption.isVisible({ timeout: 5000 }).catch(() => false))) {
    failValidation(1);
  }

  // Validation 2: Click on "No" and validate error banner and text.
  await noOption.check().catch(async () => noOption.click());

  // Wait for error message and banner to appear.
  const youAreNotEligible = page.getByText(/you are not eligible to continue/i);
  await expect(youAreNotEligible).toBeVisible({ timeout: 10000 });
  await expect(youAreNotEligible).toHaveCSS('color', 'rgb(226, 35, 57)');

  const cannotProgressBanner = page.getByRole('heading', { name: /cannot progress/i }).first();
  await expect(cannotProgressBanner).toBeVisible({ timeout: 10000 });

  const bannerText = page.getByText(/the companion card is only available to queensland permanent residents who live in queensland for more than 6 months of the year/i);
  await expect(bannerText).toBeVisible({ timeout: 5000 });

  // Screenshot at the end.
  await page.screenshot({
    path: testInfo.outputPath('applicant-ns-error-banner.png'),
    fullPage: true,
  });

  console.log('✅ Test Pass - Conditions are met');
});


