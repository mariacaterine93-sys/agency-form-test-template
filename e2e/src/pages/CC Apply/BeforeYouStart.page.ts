import { Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class BeforeYouStartPage extends AgencyFormPage {
    readonly beforeYouStartHeading: Locator;
    readonly startNewButton: Locator;
    readonly applyForNewCardRadio: Locator;

    constructor(page: Page) {
        super(page);
        this.beforeYouStartHeading = page.getByRole("heading", { name: /before you start/i });
        this.startNewButton = page.getByRole("button", { name: "Start new" });
        this.applyForNewCardRadio = page.getByRole("radio", { name: "Apply for a new card" });
    }

    async startNewIfDraftExists() {
        const hasDraft = await this.startNewButton.isVisible().catch(() => false);
        if (hasDraft) {
            await this.startNewButton.click();
        }
    }

    async selectApplyForNewCard() {
        if (await this.applyForNewCardRadio.count()) {
            await this.applyForNewCardRadio.check();
        } else {
            await this.page.getByText("Apply for a new card").click();
        }
    }

    async completeBeforeYouStart() {
        await this.startNewIfDraftExists();
        await this.selectApplyForNewCard();
        await this.clickSaveAndContinue();
    }
}
