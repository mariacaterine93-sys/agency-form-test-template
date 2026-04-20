import { Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class ReviewPage extends AgencyFormPage {
    readonly reviewHeading: Locator;

    constructor(page: Page) {
        super(page);
        this.reviewHeading = page.getByRole("heading", { name: /review/i }).first();
    }

    async continueToDeclaration() {
        await this.clickSaveAndContinue();
    }
}
