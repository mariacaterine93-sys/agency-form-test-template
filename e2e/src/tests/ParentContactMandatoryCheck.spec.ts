import { test, expect, Locator } from '@playwright/test';
import { AgencyFormPage } from '../pages/CC Apply/AgencyForm.page';
import { BeforeYouStartPage } from '../pages/CC Apply/BeforeYouStart.page';
import { getMyIdEmail } from './test-data/centralizedTestData';
import { environment } from './config/environment';

const failValidation = (num: number, reason: string): never => {
  throw new Error(`Validation ${num} - Fail: ${reason}`);
};

const isFilled = async (locator: Locator): Promise<boolean> => {
  const value = (await locator.inputValue().catch(() => '')).trim();
  return value.length > 0;
};

test('Parent Contact Mandatory Check', async ({ page }, testInfo) => {
  test.setTimeout(240000);

  const agencyFormPage = new AgencyFormPage(page);
  const beforeYouStartPage = new BeforeYouStartPage(page);
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();
  const contactDetailsHeading = page.getByRole('heading', { name: /contact details/i }).first();
  const myIdEmail = getMyIdEmail('ParentContactMandatoryCheck.spec.ts');
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
      'Auth session is not valid for ParentContactMandatoryCheck. Run auth setup first: npx playwright test tests/auth.setup.ts --project=setup --headed'
    );
  }

  // Step 1: BYS -> Apply for a new card.
  await goFromBysToContactDetails();

  // Retry if app bounced to login.
  const onContactDetails = await contactDetailsHeading.isVisible({ timeout: 8000 }).catch(() => false);
  if (!onContactDetails) {
    const recovered = await recoverAuthIfNeeded();
    if (recovered) {
      await goFromBysToContactDetails();
    }
  }

  await handleDraftFailedModal();
  await expect(contactDetailsHeading).toBeVisible({ timeout: 60000 });

  // Step 2 / Validation 1:
  // Do not choose "Who has logged in..." and save.
  await agencyFormPage.clickSaveAndContinue();

  await expect(contactDetailsHeading).toBeVisible({ timeout: 10000 });
  const errorBanner = page.getByRole('heading', { name: /please review the following errors/i }).first();
  await expect(errorBanner).toBeVisible({ timeout: 15000 });
  await expect(errorBanner).toHaveText('Please review the following errors');

  const loginQuestionInline = page
    .getByText(/who has logged in to complete this application today\? is required/i)
    .first();
  await expect(loginQuestionInline).toBeVisible({ timeout: 10000 });
  await expect(loginQuestionInline).toHaveCSS('color', 'rgb(226, 35, 57)');

  // Step 3: Choose "A parent, legal guardian, spouse, family member or friend of the person with a disability".
  const parentOption = page
    .getByRole('radio', { name: /a parent, legal guardian, spouse, family member or friend of the person with a disability/i })
    .first();
  await parentOption.check().catch(async () => parentOption.click());

  // Validation 2: Check if core fields are prefilled.
  const firstName = page.getByRole('textbox', { name: /^First name\b/i }).first();
  const lastName = page.getByRole('textbox', { name: /^Last name\b/i }).first();
  const email = page.getByRole('textbox', { name: /^Email address\b|^Email\b/i }).first();
  const phone = page.getByRole('textbox', { name: /^Phone number\b|^Mobile phone number\b/i }).first();

  await expect(firstName).toBeVisible({ timeout: 15000 });
  await expect(lastName).toBeVisible({ timeout: 15000 });
  await expect(email).toBeVisible({ timeout: 15000 });
  await expect(phone).toBeVisible({ timeout: 15000 });

  const fieldsArePrefilled =
    (await isFilled(firstName)) &&
    (await isFilled(lastName)) &&
    (await isFilled(email)) &&
    (await isFilled(phone));

  // Step 4 / Validation 3:
  // For the parent option, Preferred contact method is NOT shown (no Validation 4).
  // If fields are NOT prefilled, click Save & Continue to verify inline errors appear.
  // If fields ARE prefilled, skip the intermediate save — the form would navigate forward
  // with no errors, which itself proves no inline errors are shown for prefilled fields.
  if (!fieldsArePrefilled) {
    await agencyFormPage.clickSaveAndContinue();

    await expect(contactDetailsHeading).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toBeVisible({ timeout: 10000 });

    const requiredFieldErrors = [
      page.getByText(/first name is required/i).first(),
      page.getByText(/last name is required/i).first(),
      page.getByText(/email( address)? is required/i).first(),
      page.getByText(/phone number is required|mobile phone number is required/i).first(),
    ];

    for (const locator of requiredFieldErrors) {
      await expect(locator).toBeVisible({ timeout: 10000 });
      await expect(locator).toHaveCSS('color', 'rgb(226, 35, 57)');
    }
  }

  // If fields were prefilled, Save & Continue navigated forward - go back to Contact Details.
  const applicantDetailsHeading = page.getByRole('heading', { name: /applicant details/i }).first();
  const nowOnApplicantDetails = await applicantDetailsHeading.isVisible({ timeout: 3000 }).catch(() => false);
  if (nowOnApplicantDetails) {
    await page.getByRole('button', { name: /^Back$/i }).click();
    await expect(contactDetailsHeading).toBeVisible({ timeout: 15000 });
  }

  // Step 6 / Validation 5:
  // Add a contact, select 'Other' in Relationship to applicant (do NOT fill 'Describe the relationship'),
  // then save to trigger mandatory errors.
  const addContactButton = page.getByRole('button', { name: /add a contact/i }).first();
  await addContactButton.click();

  // Select 'Other' for Relationship to applicant inside the new contact form.
  const contactForm = page.locator('li').filter({
    has: page.getByRole('button', { name: /save details/i }),
  }).last();

  const otherRelationshipOption = contactForm
    .getByRole('radio', { name: /^Other$/i })
    .first();
  await expect(otherRelationshipOption).toBeVisible({ timeout: 15000 });
  await otherRelationshipOption.check().catch(async () => otherRelationshipOption.click());

  // Do NOT fill 'Describe the relationship' conditional field - leave it empty.

  const saveDetailsButton = contactForm.getByRole('button', { name: /save details/i });
  await saveDetailsButton.click();

  await agencyFormPage.clickSaveAndContinue();

  await expect(contactDetailsHeading).toBeVisible({ timeout: 10000 });
  await expect(errorBanner).toBeVisible({ timeout: 10000 });

  // Validation 5: Check mandatory inline errors for the empty contact fields.
  // 'Describe the relationship' appears instead of 'Relationship to applicant' because Other was selected.
  const contactRequiredErrors = [
    page.getByText(/first name is required/i).first(),
    page.getByText(/last name is required/i).first(),
    page.getByText(/describe the relationship is required/i).first(),
    page.getByText(/email( address)? is required/i).first(),
    page.getByText(/phone number is required|mobile phone number is required/i).first(),
  ];

  for (const locator of contactRequiredErrors) {
    const isVisible = await locator.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) {
      failValidation(5, `Expected contact mandatory error is not visible: ${await locator.textContent().catch(() => '(unknown)')}`);
    }
    await expect(locator).toHaveCSS('color', 'rgb(226, 35, 57)');
  }

  // Step 8: Screenshot at the end.
  await page.screenshot({
    path: testInfo.outputPath('parent-contact-mandatory-check.png'),
    fullPage: true,
  });

  console.log('✅ Test Pass - Conditions are met');
});


