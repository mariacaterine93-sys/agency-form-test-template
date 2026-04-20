import { expect, type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class AgencyFormPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async begin() {
    await this.page.getByRole('button', { name: 'Begin' }).click();
  }

  async continueWithMyId() {
    await this.page.getByRole('button', { name: 'Continue with myID' }).click();
  }

  async selectMyId() {
    await this.page.getByRole('button', { name: 'Select myID' }).click();
  }

  async enterMyIdEmail(email: string) {
    await this.page.getByRole('textbox', { name: 'myID email' }).fill(email);
  }

  async consentIfNeeded() {
    const getCodeButton = this.page.getByRole('button', { name: 'Get code' });
    if (await getCodeButton.count()) {
      await getCodeButton.click();
    }

    const rememberConsent = this.page.getByLabel(/yes,?\s*remember my consent/i);
    if (await rememberConsent.count()) {
      await rememberConsent.check();
    }

    const consentButton = this.page.getByRole('button', { name: /^Consent$/i });
    if (await consentButton.count()) {
      await consentButton.click();
    }
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/companioncardapply/i);
  }
}
