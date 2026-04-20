import { expect, type Page } from '@playwright/test';

export class BaseQgcgdPage {
  constructor(protected readonly page: Page) {}

  async waitForLoadingToFinish() {
    const loadingHeading = this.page.getByRole('heading', { name: /loading/i }).first();
    const isVisible = await loadingHeading.isVisible().catch(() => false);

    if (isVisible) {
      await loadingHeading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }
  }

  async saveAndContinue() {
    await this.page.getByRole('button', { name: 'Save and continue' }).click();
    await this.waitForLoadingToFinish();
  }

  async expectHeading(name: string | RegExp) {
    await expect(this.page.getByRole('heading', { name }).first()).toBeVisible({ timeout: 60000 });
  }

  async uploadVisibleFile(file: { name: string; mimeType: string; buffer: Buffer }) {
    const uploadButton = this.page.locator('button:has-text("browse files"):visible').last();
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      uploadButton.click(),
    ]);

    await fileChooser.setFiles(file);
    await expect(this.page.getByText(/upload complete/i)).toBeVisible({ timeout: 30000 });
  }
}
