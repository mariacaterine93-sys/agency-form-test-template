import { test, expect, Locator, Page } from '@playwright/test';
import { AgencyFormPage } from '../pages/CC Apply/AgencyForm.page';
import { BeforeYouStartPage } from '../pages/CC Apply/BeforeYouStart.page';
import { getMyIdEmail } from './test-data/centralizedTestData';
import { environment } from './config/environment';

const failValidation = (num: number): never => {
  throw new Error(`Validation ${num} - Fail`);
};

const fillIfVisible = async (locator: Locator, value: string) => {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.fill(value);
};

const fillContactForm = async (
  page: Page,
  data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
  }
) => {
  const contactForm = page.locator('li').filter({
    has: page.getByRole('button', { name: /save details/i }),
  }).last();

  await fillIfVisible(contactForm.getByRole('textbox', { name: /^First name\b/i }).first(), data.firstName);
  if (data.middleName) {
    const middleName = contactForm.getByRole('textbox', { name: /Middle name/i }).first();
    if (await middleName.isVisible().catch(() => false)) {
      await middleName.fill(data.middleName);
    }
  }
  await fillIfVisible(contactForm.getByRole('textbox', { name: /^Last name\b/i }).first(), data.lastName);

  const relationshipGroup = contactForm.getByRole('radiogroup', { name: /Relationship to applicant/i }).first();
  const relationshipGroupVisible = await relationshipGroup.isVisible().catch(() => false);
  if (relationshipGroupVisible) {
    const relationshipOption = relationshipGroup.getByRole('radio', {
      name: new RegExp(data.relationship, 'i'),
    }).first();
    await relationshipOption.check().catch(async () => relationshipOption.click());
  } else {
    await fillIfVisible(contactForm.getByLabel(/Relationship to applicant/i).first(), data.relationship);
  }

  await fillIfVisible(contactForm.getByRole('textbox', { name: /^Email address\b/i }).first(), data.email);
  await fillIfVisible(contactForm.getByRole('textbox', { name: /^Phone number\b/i }).first(), data.phone);
  await contactForm.getByRole('button', { name: /save details/i }).click();
};

test('Myself Contact1', async ({ page }, testInfo) => {
  test.setTimeout(240000);

  const agencyFormPage = new AgencyFormPage(page);
  const beforeYouStartPage = new BeforeYouStartPage(page);
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();
  const contactDetailsHeading = page.getByRole('heading', { name: /contact details/i });
  const myIdEmail = getMyIdEmail('MyselfContact1.spec.ts');
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
      'Auth session is not valid for MyselfContact1. Run auth setup first: npx playwright test tests/auth.setup.ts --project=setup --headed'
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

  // Contact Details default landing check.
  await expect(contactDetailsHeading).toBeVisible({ timeout: 60000 });

  const loginQuestion = page.getByText('Who has logged in to complete this application today?');
  if (!(await loginQuestion.isVisible().catch(() => false))) {
    failValidation(1);
  }

  const option1 = page.getByRole('radio', { name: /Myself, the person with a disability/i }).first();
  const option2 = page.getByRole('radio', { name: /A parent, legal guardian, spouse, family member or friend of the person with a disability/i }).first();
  const option3 = page.getByRole('radio', { name: /A professional support provider, paid carer or other representative/i }).first();
  if (!(await option1.isVisible().catch(() => false)) || !(await option2.isVisible().catch(() => false)) || !(await option3.isVisible().catch(() => false))) {
    failValidation(1);
  }

  // Count by matching the known option labels - exactly 3 must be visible
  const visibleOptions = [option1, option2, option3];
  for (const opt of visibleOptions) {
    if (!(await opt.isVisible().catch(() => false))) failValidation(1);
  }
  // Ensure no 4th applicant-type radio exists alongside the known 3
  const allApplicantRadios = page.getByRole('radio', {
    name: /Myself.*disability|parent.*legal guardian|professional support provider/i,
  });
  const totalApplicantTypeOptions = await allApplicantRadios.count().catch(() => 0);
  if (totalApplicantTypeOptions !== 3) {
    failValidation(1);
  }

  // Select "Myself..." and fill details.
  await option1.check().catch(async () => option1.click());
  await fillIfVisible(page.getByLabel(/First name/i).first(), 'Tom');
  await fillIfVisible(page.getByLabel(/Last name/i).first(), 'Waters');
  await fillIfVisible(page.getByLabel(/Email/i).first(), 'xyz@gmail.com');
  await fillIfVisible(page.getByLabel(/Phone number|Mobile phone number/i).first(), '0401975446');

  // Validation 2: Preferred Contact method appears with Email and Phone.
  const preferredMethodHeading = page.getByText(/Preferred contact method|Which method would you like/i).first();
  const preferredEmail = page.getByRole('radio', { name: /^Email$/i }).first();
  const preferredPhone = page.getByRole('radio', { name: /^Phone$/i }).first();
  if (
    !(await preferredMethodHeading.isVisible({ timeout: 15000 }).catch(() => false)) ||
    !(await preferredEmail.isVisible().catch(() => false)) ||
    !(await preferredPhone.isVisible().catch(() => false))
  ) {
    failValidation(2);
  }
  await preferredEmail.check().catch(async () => preferredEmail.click());

  // Add Contact 1.
  await page.getByRole('button', { name: /Add a Contact/i }).click();
  await fillContactForm(page, {
    firstName: 'Michael',
    middleName: 'Arthur',
    lastName: 'George',
    relationship: 'Parent',
    email: 'xyz@gmail.com',
    phone: '04000000',
  });

  // Validation 3: Contact 1 saved with Edit and Remove.
  const contact1Block = page
    .locator('section, article, div')
    .filter({ hasText: /Michael/ })
    .filter({ hasText: /George/ })
    .first();
  if (
    !(await contact1Block.isVisible({ timeout: 15000 }).catch(() => false)) ||
    !(await page.getByRole('button', { name: /Edit Contact 1/i }).isVisible().catch(() => false)) ||
    !(await page.getByRole('button', { name: /Remove Contact 1/i }).isVisible().catch(() => false))
  ) {
    failValidation(3);
  }

  // Add Contact 2.
  await page.getByRole('button', { name: /Add a Contact/i }).click();
  await fillContactForm(page, {
    firstName: 'Tessa',
    lastName: 'Philip',
    relationship: 'Legal Guardian',
    email: 'abc@gmail.com',
    phone: '0413837255',
  });

  // Validation 4: Contact 2 saved with Edit and Remove.
  const contact2Block = page
    .locator('section, article, div')
    .filter({ hasText: /Tessa/ })
    .filter({ hasText: /Philip/ })
    .first();
  if (
    !(await contact2Block.isVisible({ timeout: 15000 }).catch(() => false)) ||
    !(await page.getByRole('button', { name: /Edit Contact 2/i }).isVisible().catch(() => false)) ||
    !(await page.getByRole('button', { name: /Remove Contact 2/i }).isVisible().catch(() => false))
  ) {
    failValidation(4);
  }

  // Validation 5.1: Remove Contact 1.
  const removeContact1Button = page.getByRole('button', { name: /Remove Contact 1/i });
  if (!(await removeContact1Button.isVisible({ timeout: 15000 }).catch(() => false))) {
    failValidation(5);
  }
  await removeContact1Button.click();

  // Validation 5.2: Contact 2 should be updated to Contact 1.
  const contact2StillVisible = await page.getByRole('button', { name: /Edit Contact 2/i }).isVisible().catch(() => false);
  if (contact2StillVisible) {
    failValidation(5);
  }
  const updatedContact1Block = page
    .locator('section, article, div')
    .filter({ hasText: /Contact 1/ })
    .filter({ hasText: /Tessa/ })
    .filter({ hasText: /Philip/ })
    .first();
  if (!(await updatedContact1Block.isVisible({ timeout: 15000 }).catch(() => false))) {
    failValidation(5);
  }

  // Validation 5.3: Add a Contact button should be visible.
  const addContactVisible = await page.getByRole('button', { name: /Add a Contact/i }).isVisible().catch(() => false);
  if (!addContactVisible) {
    failValidation(5);
  }

  // Screenshot of Contact Details screen.
  await page.screenshot({
    path: testInfo.outputPath('myself-contact1-contact-details.png'),
    fullPage: true,
  });

  // Continue and Validation 6: Must proceed to Applicant details.
  await agencyFormPage.clickSaveAndContinue();
  const applicantDetailsHeading = page.getByRole('heading', { name: /applicant details/i }).first();
  const movedToApplicantDetails = await applicantDetailsHeading.isVisible({ timeout: 60000 }).catch(() => false);
  if (!movedToApplicantDetails) {
    failValidation(6);
  }

  console.log('✅ Test Pass - Conditions are met');
});


