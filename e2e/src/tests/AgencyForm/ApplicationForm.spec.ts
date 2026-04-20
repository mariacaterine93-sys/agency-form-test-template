import { test } from '@playwright/test';
import { config } from '../../../config';
import { AgencyFormPage } from '../../pages/CC Apply/AgencyForm.page';

test('Agency form starter flow', async ({ page }) => {
  const form = new AgencyFormPage(page);

  await form.goto(config.baseUrl);
  await form.expectLoaded();
  await form.begin();
});
