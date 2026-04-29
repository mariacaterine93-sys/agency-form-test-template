import { Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class BeforeYouStartPage extends AgencyFormPage {
    readonly beforeYouStartHeading: Locator;
    readonly draftDialog: Locator;
    readonly startNewButton: Locator;
    readonly applyForNewCardRadio: Locator;

    constructor(page: Page) {
        super(page);
        this.beforeYouStartHeading = page.getByRole("heading", { name: /before you start/i });
        this.draftDialog = page.getByRole("alertdialog", { name: /you have a draft form/i });
        this.startNewButton = page.getByRole("button", { name: "Start new" });
        this.applyForNewCardRadio = page.getByRole("radio", { name: /apply for a new card/i });
    }

    async startNewIfDraftExists() {
        const hasDraft = await this.draftDialog.waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);

        if (hasDraft) {
            await this.startNewButton.waitFor({ state: "visible", timeout: 15000 });
            await this.startNewButton.click();
            await this.draftDialog.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
        }
    }

    async selectApplyForNewCard() {
        await this.beforeYouStartHeading.waitFor({ state: "visible", timeout: 60000 });
        
        // Wait for the form options to load
        await this.page.waitForLoadState("networkidle").catch(() => {});

        const radioVisible = await this.applyForNewCardRadio.isVisible().catch(() => false);
        if (radioVisible) {
            await this.applyForNewCardRadio.check().catch(async () => {
                await this.applyForNewCardRadio.click();
            });
            return;
        }

        // Wait for text with exact match and case-insensitive
        const applyText = this.page.getByText("Apply for a new card").first();
        await applyText.waitFor({ state: "visible", timeout: 30000 });
        await applyText.click();
    }

    async completeBeforeYouStart() {
        await this.startNewIfDraftExists();
        await this.selectApplyForNewCard();
        await this.clickSaveAndContinue();
    }
}
