import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class SubmissionPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async getGeneratedId(): Promise<string | undefined> {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle').catch(() => {});

    const pageText = (await this.page.locator('main, body').first().innerText().catch(() => '')) ?? '';
    const labelledMatch = pageText.match(/(?:generated id|reference number|reference no\.?|application number)\s*[:#-]?\s*([A-Z0-9-]{6,})/i);
    const genericMatch = pageText.match(/\b[A-Z]{2,}-[A-Z0-9-]{4,}\b|\b[A-Z0-9]{8,}\b/);

    return labelledMatch?.[1] ?? genericMatch?.[0];
  }
}
