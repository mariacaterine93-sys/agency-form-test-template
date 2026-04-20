import { type Page } from '@playwright/test';
import { BaseQgcgdPage } from './BaseQgcgd.page';

export class HealthProfessionalAssessmentPage extends BaseQgcgdPage {
  constructor(page: Page) {
    super(page);
  }

  async uploadAssessment(file: { name: string; mimeType: string; buffer: Buffer }) {
    await this.uploadVisibleFile(file);
  }
}
