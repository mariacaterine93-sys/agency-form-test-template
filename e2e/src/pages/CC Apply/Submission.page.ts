import { expect, Page } from "@playwright/test";
import { AgencyFormPage } from "./AgencyForm.page";

export class SubmissionPage extends AgencyFormPage {
    constructor(page: Page) {
        super(page);
    }

    async waitForSubmissionPage() {
        await this.page.waitForLoadState("domcontentloaded").catch(() => {});
        await this.page.waitForLoadState("networkidle").catch(() => {});
        await expect(this.page.getByText(/submitted|application received|reference|thank you/i).first()).toBeVisible({ timeout: 30_000 });
    }

    async getGeneratedId(): Promise<string | undefined> {
        await this.page.waitForLoadState("domcontentloaded").catch(() => {});
        await this.page.waitForLoadState("networkidle").catch(() => {});

        const normalizeId = (raw: string): string => {
            const normalized = raw
                .replace(/\u00A0/g, " ")
                .replace(/\s+/g, "")
                .replace(/[^A-Z0-9-]/gi, "")
                .toUpperCase();

            const ccnIndex = normalized.indexOf("CCN");
            if (ccnIndex >= 0) {
                return normalized.slice(ccnIndex);
            }

            return normalized;
        };

        const extractCcnToken = (text: string): string | undefined => {
            if (!text) {
                return undefined;
            }

            const strictHyphenMatch = text.match(/\bCCN\s*-\s*[A-Z0-9-]{3,}\b/i);
            if (strictHyphenMatch?.[0]) {
                const candidate = normalizeId(strictHyphenMatch[0]);
                return /^CCN-/i.test(candidate) ? candidate : undefined;
            }

            const compactMatch = text.match(/\bCCN[A-Z0-9-]{4,}\b/i);
            if (compactMatch?.[0]) {
                const compact = normalizeId(compactMatch[0]);
                const withHyphen = compact.startsWith("CCN-") ? compact : `CCN-${compact.slice(3)}`;
                return /^CCN-[A-Z0-9-]{3,}$/i.test(withHyphen) ? withHyphen : undefined;
            }

            return undefined;
        };

        const tryExtractFromText = (pageText: string): string | undefined => {
            if (!pageText) {
                return undefined;
            }

            const strictCcn = extractCcnToken(pageText);
            if (strictCcn) {
                return strictCcn;
            }

            const labelledPatterns = [
                /(?:generated\s*id|reference\s*(?:number|no\.?)?|application\s*(?:number|id)?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\s-]{4,})/i,
                /(?:your\s*)?(?:reference|application)\s*(?:id|number|no\.?)\s*(?:is)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\s-]{4,})/i,
            ];

            for (const pattern of labelledPatterns) {
                const match = pageText.match(pattern);
                if (match?.[1]) {
                    const candidate = extractCcnToken(match[1]);
                    if (candidate) {
                        return candidate;
                    }
                }
            }

            const lines = pageText
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            for (const line of lines) {
                if (!/(generated|reference|application|CCN)/i.test(line)) {
                    continue;
                }
                const lineMatch = line.match(/([A-Z0-9]{2,}[\s-]?[A-Z0-9-]{3,})/i);
                if (lineMatch?.[1]) {
                    const candidate = extractCcnToken(lineMatch[1]);
                    if (candidate) {
                        return candidate;
                    }
                }
            }

            const genericMatch = pageText.match(/\bCCN\s*-?\s*[A-Z0-9-]{3,}\b/i);
            if (genericMatch?.[0]) {
                const candidate = extractCcnToken(genericMatch[0]);
                if (candidate) {
                    return candidate;
                }
            }

            return undefined;
        };

        const collectTextSources = async (): Promise<string[]> => {
            const visibleText = (await this.page.locator("main, body").first().innerText().catch(() => "")) ?? "";
            const hiddenText = (await this.page.locator("main, body").first().textContent().catch(() => "")) ?? "";
            const pageUrl = this.page.url();

            const hrefs = await this.page
                .locator("a[href]")
                .evaluateAll((anchors) => anchors.map((a) => (a as HTMLAnchorElement).href || ""))
                .catch(() => [] as string[]);

            const ariaLabels = await this.page
                .locator("[aria-label]")
                .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label") || ""))
                .catch(() => [] as string[]);

            return [visibleText, hiddenText, pageUrl, ...hrefs, ...ariaLabels].filter(Boolean);
        };

        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            const textSources = await collectTextSources();
            for (const source of textSources) {
                const extracted = tryExtractFromText(source);
                if (extracted) {
                    return extracted;
                }
            }
            await this.page.waitForTimeout(1000);
        }

        return undefined;
    }
}
