import { expect, type Page } from '@playwright/test';

export class AgencyFormPage {
  constructor(private readonly page: Page) {}

  async goto(url: string) {
    await this.page.goto(url);
  }

  async begin() {
    await this.page.getByRole('button', { name: 'Begin' }).click();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/companioncardapply/i);
  }
}
