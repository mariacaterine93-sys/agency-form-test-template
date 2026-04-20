import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class DisabilityDetailsPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async fillDiagnosis(description: string, day: string, month: string, year: string) {
    await this.page.locator('textarea').first().fill(description);

    const diagnosisDate = this.page.getByRole('group', { name: /estimated date of diagnosis|date of diagnosis/i });
    if (await diagnosisDate.count()) {
      await diagnosisDate.getByPlaceholder('dd').fill(day);
      await diagnosisDate.getByPlaceholder('mm').fill(month);
      await diagnosisDate.getByPlaceholder('yyyy').fill(year);
      return;
    }

    await this.page.getByPlaceholder('dd').nth(1).fill(day);
    await this.page.getByPlaceholder('mm').nth(1).fill(month);
    await this.page.getByPlaceholder('yyyy').nth(1).fill(year);
  }

  async answerSupportNeedsYes() {
    await this.page.getByLabel('Do you need help getting').getByText('Yes').click();
    await this.page.getByRole('radiogroup', { name: 'Do you need help with communication?' }).getByLabel('Yes').check();
    await this.page.getByRole('radiogroup', { name: 'Do you need help with self-' }).getByLabel('Yes').check();
    await this.page.getByLabel('Do you need help with planning and managing decisions?').getByText('Yes').click();
  }
}
