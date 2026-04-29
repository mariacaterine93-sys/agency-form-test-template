import { expect, Locator, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const companionCardApplyUrl = "https://forms.uat.beta.my.qld.gov.au/companioncardapply";

type UploadFileOptions = {
    file: {
        name: string;
        mimeType: string;
        buffer: Buffer;
    };
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
    private loadingIssueDetected = false;

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

        page.on("response", (response) => {
            if (response.request().isNavigationRequest() && response.status() >= 400) {
                this.loadingIssueDetected = true;
            }
        });

    }

    // Watches for the "Can't find draft" modal concurrently with an action.
    // If the modal appears, clicks "Start new", waits for Before You Start, then throws DraftDeleted.
    async withModalWatch<T>(action: () => Promise<T>): Promise<T> {
        let actionDone = false;
        const modal = this.page.locator('dtf-modal[title="Can\'t find draft"]');

        const modalWatcher = (async (): Promise<T> => {
            while (!actionDone) {
                const visible = await modal.isVisible().catch(() => false);
                if (visible) {
                    await modal.getByRole("button", { name: "Start new" }).click({ force: true });
                    await this.page.getByRole("heading", { name: /before you start/i })
                        .waitFor({ state: "visible", timeout: 30000 });
                    throw new Error("DraftDeleted");
                }
                await new Promise(r => setTimeout(r, 300));
            }
            return undefined as unknown as T;
        })();

        return Promise.race([
            action().then(result => { actionDone = true; return result; }),
            modalWatcher,
        ]).finally(() => { actionDone = true; });
    }

    async goToCompanionCardApply() {
        await this.page.goto(companionCardApplyUrl);
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

    async navigateToAgencyFormIfNeeded() {
        await this.page.waitForURL(/forms\.uat\.beta\.my\.qld\.gov\.au\/companioncardapply/i, { timeout: 90000 }).catch(() => {});

        if (/companioncardapply\/redirect/i.test(this.page.url()) || /companioncardapply\/?$/i.test(this.page.url())) {
            await this.page.goto("https://forms.uat.beta.my.qld.gov.au/companioncardapply/agency-form");
        }
    }

    async ensureNoLoadingError() {
        await this.page.waitForLoadState("domcontentloaded").catch(() => {});

        const loadingHeading = this.page.getByRole("heading", { name: /loading/i }).first();
        const showsLoading = await loadingHeading.isVisible().catch(() => false);
        if (showsLoading) {
            const loadingCleared = await loadingHeading.waitFor({ state: "hidden", timeout: 60000 }).then(() => true).catch(() => false);
            if (!loadingCleared) {
                console.log("Loading error");
                throw new Error("Loading error");
            }
        }

        const pageText = (await this.page.locator("body").innerText().catch(() => "")) ?? "";
        const hasKnownLoadError =
            this.loadingIssueDetected ||
            /404/.test(this.page.url()) ||
            /404|page not found|this page isn'?t working|service unavailable|too many redirects|unexpected error|bad gateway/i.test(pageText);

        if (hasKnownLoadError) {
            console.log("Loading error");
            throw new Error("Loading error");
        }
    }

    async clickSaveAndContinue() {
        await this.withModalWatch(() => this.saveAndContinueButton.click());
        await this.ensureNoLoadingError();
    }

    async expectCurrentHeading(headingName: string | RegExp) {
        await expect(this.page.getByRole("heading", { name: headingName }).first()).toBeVisible({ timeout: 60_000 });
    }

    async uploadFile(options: UploadFileOptions) {
        // Write buffer to a temp file so all browsers handle it consistently
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, options.file.name);
        fs.writeFileSync(tempFilePath, options.file.buffer);

        try {
            const uploadButton = this.page.getByRole("button", { name: "browse files" }).last();
            const [fileChooser] = await Promise.all([
                this.page.waitForEvent("filechooser"),
                uploadButton.click(),
            ]);

            await fileChooser.setFiles(tempFilePath);

            // Wait for either success or failure indicator
            const uploadSuccess = this.page.getByText(/upload complete|file uploaded|uploaded successfully/i);
            const uploadError = this.page.getByText(/unable to upload/i);

            await Promise.race([
                uploadSuccess.waitFor({ state: "visible", timeout: 30_000 }),
                uploadError.waitFor({ state: "visible", timeout: 30_000 }).then(() => {
                    throw new Error(`File upload failed: "Unable to upload file" shown for ${options.file.name}`);
                }),
            ]);
        } finally {
            fs.rmSync(tempFilePath, { force: true });
        }
    }
}
