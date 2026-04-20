import { Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class HealthProfessionalAssessmentPage extends AgencyFormPage {
    readonly uploadAssessmentHeading: Locator;
    readonly browseFilesButton: Locator;

    constructor(page: Page) {
        super(page);
        this.uploadAssessmentHeading = page.getByText(/upload all pages of the health professional assessment/i);
        this.browseFilesButton = page.getByRole("button", { name: "browse files" }).last();
    }

    async uploadAssessmentDocument(file: { name: string; mimeType: string; buffer: Buffer }) {
        await this.uploadFile({ file });
    }
}
