import { type Page } from '@playwright/test';

export class ContactDetailsPage {
  constructor(private readonly page: Page) {}

  async continueAsEmail() {
    await this.page.getByText('Email', { exact: true }).click();
    await this.page.getByRole('button', { name: 'Save and continue' }).click();
  }
}
