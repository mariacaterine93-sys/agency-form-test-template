import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class BeforeYouStartPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async startNewIfDraftExists() {
    const startNewButton = this.page.getByRole('button', { name: 'Start new' });
    const hasDraft = await startNewButton.isVisible().catch(() => false);

    if (hasDraft) {
      await startNewButton.click();
    }
  }

  async selectApplyForNewCard() {
    const radio = this.page.getByRole('radio', { name: 'Apply for a new card' });
    if (await radio.count()) {
      await radio.check();
      return;
    }

    await this.page.getByText('Apply for a new card').click();
  }
}
