import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class DeclarationPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async acceptAllDeclarations() {
    await this.page.getByRole('checkbox', { name: /i agree that i have read and understood all the information above/i }).check();
    await this.page.getByRole('checkbox', { name: /i consent to share my digital identity details with the apply for a companion card service/i }).check();
    await this.page.getByRole('checkbox', { name: /i consent to the collection, use and sharing of my personal information to the apply for a companion card service/i }).check();
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }
}
