import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class ApplicantDetailsPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async setPermanentResidentYes() {
    await this.page.getByRole('radio', { name: 'Yes' }).check();
  }

  async fillDateOfBirth(day: string, month: string, year: string) {
    await this.page.getByPlaceholder('dd').fill(day);
    await this.page.getByPlaceholder('mm').fill(month);
    await this.page.getByPlaceholder('yyyy').fill(year);
  }

  async uploadApplicantPhoto(file: { name: string; mimeType: string; buffer: Buffer }) {
    await this.uploadVisibleFile(file);
  }

  async verifyUploadedPhoto() {
    await this.page.getByRole('checkbox', {
      name: /uploaded photo has been sighted and verified by my health professional/i,
    }).check();
  }
}
