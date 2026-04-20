import { expect, Locator, Page } from "@playwright/test";
import { config } from "../../../config";

type UploadFileOptions = {
    fileComponentLabel?: string;
    file: {
        name: string;
        mimeType: string;
        buffer: Buffer;
    };
    isNewFileComponent?: boolean;
    isAssistedForms?: boolean;
};

export class AgencyFormPage {
    readonly page: Page;
    readonly beginButton: Locator;
    readonly continueWithMyIdButton: Locator;
    readonly selectMyIdButton: Locator;
    readonly myIdEmailTextBox: Locator;
    readonly getCodeButton: Locator;
    readonly rememberConsentCheckBox: Locator;
    readonly consentButton: Locator;
    readonly saveAndContinueButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.beginButton = page.getByRole("button", { name: "Begin" });
        this.continueWithMyIdButton = page.getByRole("button", { name: "Continue with myID" });
        this.selectMyIdButton = page.getByRole("button", { name: "Select myID" });
        this.myIdEmailTextBox = page.getByRole("textbox", { name: "myID email" });
        this.getCodeButton = page.getByRole("button", { name: "Get code" });
        this.rememberConsentCheckBox = page.getByLabel(/yes,?\s*remember my consent/i);
        this.consentButton = page.getByRole("button", { name: /^Consent$/i });
        this.saveAndContinueButton = page.getByRole("button", { name: "Save and continue" });
    }

    async goToCompanionCardApply() {
        await this.page.goto(config.baseUrl);
    }

    async beginApplication() {
        await this.beginButton.click();
    }

    async continueWithMyId() {
        await this.continueWithMyIdButton.click();
    }

    async selectMyId() {
        await this.selectMyIdButton.click();
    }

    async enterMyIdEmail(emailAddress: string) {
        await this.myIdEmailTextBox.fill(emailAddress);
    }

    async consentIfRequired() {
        if (await this.getCodeButton.count()) {
            await this.getCodeButton.click();
        }

        if (await this.rememberConsentCheckBox.count()) {
            await this.rememberConsentCheckBox.check();
        }

        if (await this.consentButton.count()) {
            await this.consentButton.click();
        }
    }

    async handleLoadingIfDisplayed() {
        const loadingHeading = this.page.getByRole("heading", { name: /loading/i }).first();
        const isVisible = await loadingHeading.isVisible().catch(() => false);

        if (isVisible) {
            await loadingHeading.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
        }
    }

    async clickSaveAndContinue() {
        await this.saveAndContinueButton.click();
        await this.handleLoadingIfDisplayed();
    }

    async expectCurrentHeading(headingName: string | RegExp) {
        await expect(this.page.getByRole("heading", { name: headingName }).first()).toBeVisible({ timeout: 60_000 });
    }

    async uploadFile(options: UploadFileOptions) {
        const uploadButton = this.page.getByRole("button", { name: "browse files" }).last();
        const [fileChooser] = await Promise.all([
            this.page.waitForEvent("filechooser"),
            uploadButton.click(),
        ]);

        await fileChooser.setFiles(options.file);
        await expect(this.page.getByText(/upload complete/i)).toBeVisible({ timeout: 30_000 });
    }
}
