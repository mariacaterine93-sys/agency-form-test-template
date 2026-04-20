import { Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class ApplicantDetailsPage extends AgencyFormPage {
    readonly applicantDetailsHeading: Locator;
    readonly permanentResidentRadioGroup: Locator;
    readonly firstNameField: Locator;
    readonly middleNameField: Locator;
    readonly lastNameField: Locator;
    readonly dobGroup: Locator;
    readonly residentialAddressField: Locator;
    readonly sendCardToDifferentAddressCheckBox: Locator;
    readonly applicantPhotoVerificationCheckBox: Locator;

    constructor(page: Page) {
        super(page);
        this.applicantDetailsHeading = page.getByRole("heading", { name: /applicant details/i }).first();
        this.permanentResidentRadioGroup = page.getByRole("radiogroup", {
            name: /is the person with a disability a permanent resident of queensland\?/i,
        });
        this.firstNameField = page.getByRole("textbox", { name: "First name" });
        this.middleNameField = page.getByRole("textbox", { name: "Middle name (optional)" });
        this.lastNameField = page.getByRole("textbox", { name: "Last name" });
        this.dobGroup = page.getByRole("group", { name: "Date of birth" });
        this.residentialAddressField = page.getByRole("combobox", { name: "Residential address" });
        this.sendCardToDifferentAddressCheckBox = page.getByRole("checkbox", {
            name: "Send my Companion Card to a different address",
        });
        this.applicantPhotoVerificationCheckBox = page.getByRole("checkbox", {
            name: /uploaded photo has been sighted and verified by my health professional/i,
        });
    }

    async waitForApplicantDetailsPage() {
        await this.applicantDetailsHeading.waitFor({ state: "visible", timeout: 60_000 });
    }

    async selectPermanentResident(isPermanentResident: boolean) {
        const label = isPermanentResident ? "Yes" : "No";
        const radioInGroup = this.permanentResidentRadioGroup.getByRole("radio", { name: label });

        if (await radioInGroup.count()) {
            await radioInGroup.check();
            return;
        }

        await this.page.getByRole("radio", { name: label }).first().check();
    }

    async fillDateOfBirth(day: string, month: string, year: string) {
        await this.dobGroup.getByRole("spinbutton").nth(0).fill(day);
        await this.dobGroup.getByRole("spinbutton").nth(1).fill(month);
        await this.dobGroup.getByRole("spinbutton").nth(2).fill(year);
    }

    async uploadApplicantPhoto(file: { name: string; mimeType: string; buffer: Buffer }) {
        await this.uploadFile({ file });
    }

    async verifyApplicantPhoto() {
        await this.applicantPhotoVerificationCheckBox.check();
    }
}
