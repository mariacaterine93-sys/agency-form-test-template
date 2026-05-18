import { test, expect, Locator, Page } from '@playwright/test';
import { AgencyFormPage } from '../../../pages/CC Apply/AgencyForm.page';
import { BeforeYouStartPage } from '../../../pages/CC Apply/BeforeYouStart.page';
import { getLoginIdentityForSpec } from '../../test-data/centralizedTestData';
import { environment } from '../../config/environment';

const fillParentContactDetails = async (page: Page) => {
  await page.getByRole('textbox', { name: /^First name\b/i }).first().fill('Tom');
  await page.getByRole('textbox', { name: /^Last name\b/i }).first().fill('Waters');
  await page.getByRole('textbox', { name: /^Email address\b|^Email\b/i }).first().fill('xyz@gmail.com');
  await page.getByRole('textbox', { name: /^Phone number\b|^Mobile phone number\b/i }).first().fill('0401975446');
};

const setAddressValue = async (
  field: Locator,
  value: string,
  options?: {
    searchTerms?: string[];
    allowPrefilledMatch?: boolean;
    requireDropdownSelection?: boolean;
    acceptValueContains?: string;
  }
) => {
  await field.waitFor({ state: 'visible', timeout: 20000 });
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
  const expectedValue = normalize(value);

  if (options?.allowPrefilledMatch) {
    const currentValue = normalize(await field.inputValue().catch(() => ''));
    if (currentValue === expectedValue || currentValue.includes(expectedValue) || expectedValue.includes(currentValue)) {
      return;
    }
  }

  const page = field.page();
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const exactVisibleOption = visibleOptions.filter({ hasText: new RegExp(`^\\s*${escapedValue}\\s*$`, 'i') }).first();
    const hasAnyOption = await visibleOptions.first().isVisible({ timeout: 8000 }).catch(() => false);
    if (!hasAnyOption) {
      continue;
    }

    if (await exactVisibleOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await exactVisibleOption.click({ force: true });
      return;
    }

    await visibleOptions.first().click({ force: true });
    return;
  }

  if (!options?.requireDropdownSelection) {
    const currentValue = normalize(await field.inputValue().catch(() => ''));
    if (currentValue === expectedValue || currentValue.includes(expectedValue)) {
      return;
    }
  }

  if (options?.acceptValueContains) {
    const currentValue = normalize(await field.inputValue().catch(() => ''));
    const acceptedToken = normalize(options.acceptValueContains);
    if (currentValue.includes(acceptedToken)) {
      return;
    }
  }

  if (options?.requireDropdownSelection === false) {
    return;
  }

  throw new Error('Address dropdown options did not appear.');
};

test('Parent Applicant', async ({ page }) => {
  test.setTimeout(300000);

  const agencyFormPage = new AgencyFormPage(page);
  const beforeYouStartPage = new BeforeYouStartPage(page);
  const bysHeading = page.getByRole('heading', { name: /before you start|what are you trying to do\?/i }).first();
  const contactDetailsHeading = page.getByRole('heading', { name: /contact details/i }).first();
  const applicantDetailsHeading = page.getByRole('heading', { name: /applicant details/i }).first();
  const disabilityDetailsHeading = page.getByRole('heading', { name: /disability details/i }).first();
  const loginIdentity = getLoginIdentityForSpec('ParentApplicant.spec.ts');
  const loginEmail = loginIdentity.email;
  const agencyFormUrl = `${process.env.DTP_ROOT_URL || 'https://forms.preprod.beta.my.qld.gov.au'}/companioncardapply/agency-form`;
  const uploadPngPath = 'C:/PlaywrightTS/repo-doc-images/image1.png';

  const handleDraftFailedModal = async () => {
    const draftFailedHeading = page.getByRole('heading', { name: /your draft failed to load/i });
    const visible = await draftFailedHeading.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) return false;

    await page.getByRole('button', { name: /back to start/i }).click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await draftFailedHeading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    return true;
  };

  const waitForBysOrDraft = async (timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const bysVisible = await bysHeading.isVisible({ timeout: 2000 }).catch(() => false);
      if (bysVisible) {
        return true;
      }

      const draftVisible = await beforeYouStartPage.draftDialog.isVisible().catch(() => false);
      if (draftVisible) {
        return true;
      }

      await page.waitForTimeout(1000);
    }

    return false;
  };

  const recoverAuthIfNeeded = async (): Promise<boolean> => {
    const loginHeading = page.getByRole('heading', { name: /login to continue/i });
    const qdiContinueButton = page.getByRole('button', { name: /continue with queensland digital identity|continue with queensland/i }).first();
    const loginVisible = await loginHeading.isVisible({ timeout: 8000 }).catch(() => false);
    const qdiButtonVisible = await qdiContinueButton.isVisible({ timeout: 3000 }).catch(() => false);
    const onAuthUrl = /preprod\.auth\.qld\.gov\.au|oauth-prep\.tmr\.qld\.gov\.au/i.test(page.url());
    const authRequired = loginVisible || qdiButtonVisible || onAuthUrl;

    if (!authRequired) {
      return false;
    }

    await agencyFormPage.loginWithIdentity(loginIdentity.provider, loginEmail);

    try {
      await agencyFormPage.ensureNoLoadingError().catch(() => {});
      const reachedBysAfterLogin = await waitForBysOrDraft(180000);
      if (reachedBysAfterLogin) {
        return true;
      }

      await page.goto(agencyFormUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await agencyFormPage.ensureNoLoadingError().catch(() => {});
      return await waitForBysOrDraft(15000);
    } catch {
      await page.goto(agencyFormUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await agencyFormPage.ensureNoLoadingError().catch(() => {});
      return await waitForBysOrDraft(15000);
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

  const ensureBysWithFreshMyIdLogin = async () => {
    await page.goto(agencyFormUrl, { waitUntil: 'domcontentloaded' });
    await agencyFormPage.ensureNoLoadingError();
    await handleDraftFailedModal();

    const alreadyAtBys = await waitForBysOrDraft(8000);
    if (alreadyAtBys) {
      return;
    }

    const recovered = await recoverAuthIfNeeded();
    await handleDraftFailedModal();

    if (recovered) {
      const bysAfterRecovery = await waitForBysOrDraft(30000);
      if (bysAfterRecovery) {
        return;
      }

      throw new Error(
        `Identity login completed but app did not return to Before You Start. Current URL: ${page.url()}.`
      );
    }

    // Full login path: do not rely on any saved auth state.
    await agencyFormPage.loginWithIdentity(loginIdentity.provider, loginEmail, { navigateFromEntry: true });
    await handleDraftFailedModal();

    const bysVisible = await waitForBysOrDraft(180000);
    if (!bysVisible) {
      throw new Error(
        `Auth session is not valid for Parent Applicant after full ${loginIdentity.provider} login flow. ` +
        `Timed out waiting for Before You Start after identity login. Current URL: ${page.url()}.`
      );
    }
  };

  // Stable auth entry: use env/mapped myID email and recover login inline when needed.
  await ensureBysWithFreshMyIdLogin();
  await beforeYouStartPage.startNewIfDraftExists();
  await handleDraftFailedModal();

  await goFromBysToContactDetails();

  const onContactDetails = await contactDetailsHeading.isVisible({ timeout: 8000 }).catch(() => false);
  if (!onContactDetails) {
    const recovered = await recoverAuthIfNeeded();
    if (recovered) {
      await goFromBysToContactDetails();
    }
  }

  await expect(contactDetailsHeading).toBeVisible({ timeout: 60000 });

  const parentOption = page
    .getByRole('radio', { name: /a parent, legal guardian, spouse, family member or friend of the person with a disability/i })
    .first();
  await parentOption.check().catch(async () => parentOption.click());
  await fillParentContactDetails(page);

  await agencyFormPage.clickSaveAndContinue();
  await expect(applicantDetailsHeading).toBeVisible({ timeout: 60000 });

  const yesOption = page.getByRole('radio', { name: /^Yes$/i }).first();
  await yesOption.check().catch(async () => yesOption.click());

  // Parent-specific validation: optional Email and Phone are shown before Residential address.
  const optionalEmailLabel = page.getByText(/Email address\s*\(optional\)/i).first();
  const optionalPhoneLabel = page.getByText(/Phone number\s*\(optional\)/i).first();
  const residentialAddress = page.getByRole('combobox', { name: /Residential address/i }).first();

  await expect(optionalEmailLabel).toBeVisible({ timeout: 15000 });
  await expect(optionalPhoneLabel).toBeVisible({ timeout: 15000 });
  await expect(residentialAddress).toBeVisible({ timeout: 15000 });

  const emailY = (await optionalEmailLabel.boundingBox())?.y ?? 0;
  const phoneY = (await optionalPhoneLabel.boundingBox())?.y ?? 0;
  const residentialY = (await residentialAddress.boundingBox())?.y ?? 0;
  if (!(emailY < residentialY && phoneY < residentialY)) {
    throw new Error('Optional Email/Phone fields are not displayed before Residential address.');
  }

  // Fill Email address (optional), leave Phone number (optional) blank.
  const optionalEmailInput = page.getByRole('textbox', { name: /Email address\s*\(optional\)/i }).first();
  await optionalEmailInput.fill('xyz@gmail.com');

  await page.getByRole('textbox', { name: /^First name\b/i }).first().fill('Michael');
  await page.getByRole('textbox', { name: /Middle name \(optional\)/i }).first().fill('Arthur');
  await page.getByRole('textbox', { name: /^Last name\b/i }).first().fill('George');

  const dobParts = page.getByRole('spinbutton', { name: 'Date of birth' });
  await dobParts.nth(0).fill('22');
  await dobParts.nth(1).fill('12');
  await dobParts.nth(2).fill('1993');

  const residentialCurrentValue = (await residentialAddress.inputValue().catch(() => '')).trim();
  if (!residentialCurrentValue) {
    await setAddressValue(residentialAddress, '10 SEATTLE CL SPRING MOUNTAIN QLD 4300', {
      searchTerms: ['10 SEATTLE CL SPRING MOUNTAIN QLD 4300'],
      requireDropdownSelection: false
    });
  }
  await expect(residentialAddress).toHaveValue(/.+/i, { timeout: 15000 });

  const differentAddressCheckbox = page.getByRole('checkbox', { name: /send my companion card to a different address/i }).first();
  await differentAddressCheckbox.check();
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

  const browseFilesButton = page.getByRole('button', { name: /browse files/i }).first();
  await expect(browseFilesButton).toBeVisible({ timeout: 15000 });
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    browseFilesButton.click()
  ]);
  await fileChooser.setFiles(uploadPngPath);

  await expect(page.getByRole('button', { name: /image1\.png/i }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/upload complete/i).first()).toBeVisible({ timeout: 20000 });

  const verificationCheckbox = page
    .getByRole('checkbox', { name: /i confirm that the uploaded photo has been sighted and verified by my health professional\./i })
    .first();
  await verificationCheckbox.check().catch(async () => verificationCheckbox.click());

  await agencyFormPage.clickSaveAndContinue();
  await expect(disabilityDetailsHeading).toBeVisible({ timeout: 60000 });

  console.log('✅ Test Pass - Disability details screen is displayed');
});


