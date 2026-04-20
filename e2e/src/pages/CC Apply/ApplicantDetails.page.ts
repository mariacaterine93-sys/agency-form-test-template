import { Locator, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class ApplicantDetailsPage extends AgencyFormPage {
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
        this.permanentResidentRadioGroup = page.getByRole("radiogroup", {
            name: "Is the person with a disability a permanent resident of Queensland?",
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

    async selectPermanentResident(isPermanentResident: boolean) {
        const label = isPermanentResident ? "Yes" : "No";
        await this.permanentResidentRadioGroup.getByRole("radio", { name: label }).check();
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
