import { expect, Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class ReviewPage extends AgencyFormPage {
    readonly reviewHeading: Locator;

    constructor(page: Page) {
        super(page);
        this.reviewHeading = page.getByRole("heading", { name: /review/i }).first();
    }

    async waitForReviewPage() {
        await expect(this.reviewHeading).toBeVisible({ timeout: 60_000 });
    }

    async continueToDeclaration() {
        await this.clickSaveAndContinue();
    }
}
