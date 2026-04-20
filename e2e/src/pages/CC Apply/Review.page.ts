import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class ReviewPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async continueToDeclaration() {
    await this.saveAndContinue();
  }
}
