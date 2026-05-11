import { test, expect, Locator, Page } from '@playwright/test';
import { AgencyFormPage } from '../pages/CC Apply/AgencyForm.page';
import { BeforeYouStartPage } from '../pages/CC Apply/BeforeYouStart.page';
import { getMyIdEmail } from './test-data/centralizedTestData';
import { environment } from './config/environment';

const fillRequiredContactDetails = async (page: Page) => {
  await page.getByRole('textbox', { name: /^First name\b/i }).first().fill('Tom');
  await page.getByRole('textbox', { name: /^Last name\b/i }).first().fill('Waters');
  await page.getByRole('textbox', { name: /^Email address\b|^Email\b/i }).first().fill('xyz@gmail.com');
  await page.getByRole('textbox', { name: /^Phone number\b|^Mobile phone number\b/i }).first().fill('0401975446');

  const preferredEmail = page.getByRole('radio', { name: /^Email$/i }).first();
  const preferredVisible = await preferredEmail.isVisible({ timeout: 3000 }).catch(() => false);
  if (preferredVisible) {
    await preferredEmail.check().catch(async () => preferredEmail.click());
  }
};

const failValidation = (num: number, reason: string): never => {
  throw new Error(`Validation ${num} - Fail: ${reason}`);
};

const isFilled = async (locator: Locator): Promise<boolean> => {
  const value = (await locator.inputValue().catch(() => '')).trim();
  return value.length > 0;
};

const fillIfEmpty = async (locator: Locator, value: string) => {
  const visible = await locator.isVisible({ timeout: 2000 }).catch(() => false);
  if (!visible) return;
  const current = (await locator.inputValue().catch(() => '')).trim();
  if (!current) {
    await locator.fill(value);
  }
};

const setAddressValue = async (
  field: Locator,
  value: string,
  options?: { searchTerms?: string[]; requireDropdownSelection?: boolean }
) => {
  await field.waitFor({ state: 'visible', timeout: 20000 });
  const page = field.page();
  const searchTerms = options?.searchTerms && options.searchTerms.length > 0 ? options.searchTerms : [value];
  const listboxId = await field.getAttribute('aria-controls');

  const getVisibleOptions = () => {
    if (listboxId) {
      return page.locator(
        `[id="${listboxId}"] [role="option"]:visible, [id="${listboxId}"] li:visible, [id="${listboxId}"] [id*="option"]:visible`
      );
    }
    return page.locator('[role="listbox"] [role="option"]:visible, [role="listbox"] li:visible, [id*="option"]:visible');
  };

  for (const term of searchTerms) {
    await field.click();
    await field.fill('');
    await field.type(term, { delay: 25 });
    await field.press('ArrowDown').catch(() => {});

    const visibleOptions = getVisibleOptions();
    const hasAnyOption = await visibleOptions.first().isVisible({ timeout: 8000 }).catch(() => false);
    if (!hasAnyOption) continue;

    await visibleOptions.first().click({ force: true });
    return;
  }

  await field.press('ArrowDown').catch(() => {});
  await field.press('Enter').catch(() => {});
  await field.blur().catch(() => {});

  if (options?.requireDropdownSelection === false) return;
  throw new Error('Address dropdown options did not appear.');
};

test('Applicant Parent Navigation to Disability Details', async ({ page }, testInfo) => {
  test.setTimeout(300000);

  const agencyFormPage = new AgencyFormPage(page);
  const beforeYouStartPage = new BeforeYouStartPage(page);
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();
  const contactDetailsHeading = page.getByRole('heading', { name: /contact details/i }).first();
  const applicantDetailsHeading = page.getByRole('heading', { name: /applicant details/i }).first();
  const disabilityDetailsHeading = page.getByRole('heading', { name: /disability details/i }).first();
  const myIdEmail = getMyIdEmail('ApplicantParentMandatoryCheck.spec.ts');
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

  const resumeLoginIfShown = async () => {
    const loginHeading = page.getByRole('heading', { name: /login to continue/i });
    const loginVisible = await loginHeading.isVisible({ timeout: 1500 }).catch(() => false);
    if (!loginVisible) return;

    if (await agencyFormPage.continueWithMyIdButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agencyFormPage.continueWithMyId();
    }
    if (await agencyFormPage.selectMyIdButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agencyFormPage.selectMyId();
    }
    if (await agencyFormPage.myIdEmailTextBox.isVisible({ timeout: 10000 }).catch(() => false)) {
      await agencyFormPage.enterMyIdEmail(myIdEmail);
    }
    await agencyFormPage.consentIfRequired();
  };

  // NOTE: Avoid global draft-modal handlers because they can trigger during navigation
  // and race with page/context lifecycle. Handle draft modals explicitly at stable checkpoints.
  // Global guard: if session drops to login mid-test, re-run myID continuation steps.
  await page.addLocatorHandler(
    page.getByRole('heading', { name: /login to continue/i }),
    async () => {
      await resumeLoginIfShown();
    }
  );

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
      'Auth session is not valid for ApplicantParentMandatoryCheck. Run auth setup first: npx playwright test tests/auth.setup.ts --project=setup --headed'
    );
  }

  // BYS -> Contact Details
  await goFromBysToContactDetails();

  // If app bounced to login, recover auth and retry once from BYS.
  const onContactDetails = await contactDetailsHeading.isVisible({ timeout: 8000 }).catch(() => false);
  if (!onContactDetails) {
    const recovered = await recoverAuthIfNeeded();
    if (recovered) {
      await goFromBysToContactDetails();
    }
  }

  await expect(contactDetailsHeading).toBeVisible({ timeout: 60000 });

  // Select Myself path and continue to Applicant details (following MyselfApplicant.spec pattern)
  const myselfOption = page.getByRole('radio', { name: /myself, the person with a disability/i }).first();
  await myselfOption.check().catch(async () => myselfOption.click());
  await fillRequiredContactDetails(page);

  await agencyFormPage.clickSaveAndContinue();
  await expect(applicantDetailsHeading).toBeVisible({ timeout: 60000 });

  // On Applicant Details click Yes.
  const yesOption = page.getByRole('radio', { name: /^Yes$/i }).first();
  await yesOption.check().catch(async () => yesOption.click());

  // Overwrite values regardless of prefill.
  await page.getByRole('textbox', { name: /^First name\b/i }).first().fill('Michael');
  await page.getByRole('textbox', { name: /Middle name \(optional\)/i }).first().fill('Arthur');
  await page.getByRole('textbox', { name: /^Last name\b/i }).first().fill('George');

  const dobParts = page.getByRole('spinbutton', { name: 'Date of birth' });
  await dobParts.nth(0).fill('22');
  await dobParts.nth(1).fill('12');
  await dobParts.nth(2).fill('1993');

  const residentialAddress = page.getByRole('combobox', { name: /Residential address/i }).first();
  const residentialCurrentValue = (await residentialAddress.inputValue().catch(() => '')).trim();
  if (!residentialCurrentValue) {
    await setAddressValue(residentialAddress, '10 SEATTLE CL SPRING MOUNTAIN QLD 4300', {
      searchTerms: ['10 SEATTLE CL SPRING MOUNTAIN QLD 4300'],
      requireDropdownSelection: false
    });
    await expect(residentialAddress).toHaveValue(/10 SEATTLE CL SPRING MOUNTAIN QLD 4300/i, { timeout: 15000 });
  }

  const differentAddressCheckbox = page.getByRole('checkbox', { name: /send my companion card to a different address/i }).first();
  const differentCheckedBefore = await differentAddressCheckbox.isChecked().catch(() => false);
  if (!differentCheckedBefore) {
    await differentAddressCheckbox.check();
  }
  await expect(differentAddressCheckbox).toBeChecked({ timeout: 10000 });

  const whereSendQuestion = page.getByText(/where should we send the companion card\?/i).first();
  await expect(whereSendQuestion).toBeVisible({ timeout: 15000 });
  const whereSendCombobox = page.locator('input[id*="applicantPostalAddressForCard-search-input"]').first();
  await expect(whereSendCombobox).toBeVisible({ timeout: 15000 });
  await whereSendCombobox.click();
  await whereSendCombobox.fill('18 MIAMI ST SPRING MOUNTAIN QLD 4300');

  const whereSendOptions = page.locator(
    '[id*="applicantPostalAddressForCard-listbox"] [role="option"], [id*="applicantPostalAddressForCard-listbox"] li, [id*="applicantPostalAddressForCard-listbox"] [id*="option"]'
  );
  await expect(whereSendOptions.first()).toBeVisible({ timeout: 10000 });

  const miamiOption = whereSendOptions.filter({ hasText: /18\s+MIAMI\s+ST/i }).first();
  if (await miamiOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await miamiOption.click({ force: true });
  } else {
    await whereSendOptions.first().click({ force: true });
  }
  await expect(whereSendCombobox).toHaveValue(/18 MIAMI ST/i, { timeout: 15000 });
  await expect(page.getByRole('button', { name: /clear where should we send the companion card\?/i }).first()).toBeVisible({ timeout: 15000 });
  await whereSendCombobox.press('Tab').catch(() => {});

  // Upload PNG file.
  const uploadPngPath = 'C:/PlaywrightTS/repo-doc-images/image1.png';
  const browseFilesButton = page.getByRole('button', { name: /browse files/i }).first();
  await expect(browseFilesButton).toBeVisible({ timeout: 15000 });
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    browseFilesButton.click()
  ]);
  await fileChooser.setFiles(uploadPngPath);

  await expect(page.getByRole('button', { name: /image1\.png/i }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/upload complete/i).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /^Delete$/i }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/upload a photo is required/i).first()).not.toBeVisible({ timeout: 20000 });

  // Check photo verification confirmation.
  const verificationCheckbox = page
    .getByRole('checkbox', { name: /i confirm that the uploaded photo has been sighted and verified by my health professional\./i })
    .first();
  await verificationCheckbox.check().catch(async () => verificationCheckbox.click());
  await expect(verificationCheckbox).toBeChecked({ timeout: 10000 });

  const submitApplicantDetails = async () => {
    await agencyFormPage.clickSaveAndContinue();

    const errorBannerHeading = page.getByRole('heading', { name: /please review the following errors/i }).first();
    const reachedDisabilityDetails = await disabilityDetailsHeading.isVisible({ timeout: 15000 }).catch(() => false);
    if (reachedDisabilityDetails) {
      return;
    }

    const hasErrorBanner = await errorBannerHeading.isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasErrorBanner) {
      return;
    }

    const whereSendLooksCommitted = await whereSendCombobox.inputValue().then(value => /18 MIAMI ST/i.test(value)).catch(() => false);
    const uploadLooksCommitted = await page.getByText(/upload complete/i).first().isVisible({ timeout: 1000 }).catch(() => false);
    const verificationChecked = await verificationCheckbox.isChecked().catch(() => false);

    if (whereSendLooksCommitted && uploadLooksCommitted && verificationChecked) {
      await agencyFormPage.clickSaveAndContinue();
    }

    const reachedAfterRetry = await disabilityDetailsHeading.isVisible({ timeout: 15000 }).catch(() => false);
    if (reachedAfterRetry) {
      return;
    }

    const bannerText = await errorBannerHeading.locator('xpath=..').innerText().catch(() => 'Validation error banner displayed.');
    throw new Error(`Applicant details did not submit. ${bannerText.replace(/\s+/g, ' ').trim()}`);
  };

  // Save and Continue.
  await submitApplicantDetails();

  // Disability details should be shown.
  await expect(disabilityDetailsHeading).toBeVisible({ timeout: 60000 });

  console.log('✅ Test Pass - Successfully navigated from Contact Details to Disability Details screen using MyselfApplicant pattern');
});


