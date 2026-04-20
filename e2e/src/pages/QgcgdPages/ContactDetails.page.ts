import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class ContactDetailsPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async chooseApplicantIsMyself() {
    await this.page.getByText('Myself, the person with a').click();
  }

  async continueAsEmail() {
    await this.page.getByText('Email', { exact: true }).click();
  }

  async continueToApplicantDetails() {
    await this.saveAndContinue();
  }
}
