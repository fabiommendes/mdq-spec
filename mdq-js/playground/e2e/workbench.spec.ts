import { expect, test } from "@playwright/test";

// Story: stories/review-after-answer.md

test("a wrong answer shows its mark and the key in review", async ({
	page,
}) => {
	await page.goto("/#/local/long-stem");
	const answer = page.getByTestId("mode-answer");
	const review = page.getByTestId("mode-review");

	await expect(review).toContainText("Answer first");
	await answer.getByLabel(/maré do Atlântico/).check();

	const picked = review.locator(".mdq-choice", { hasText: "maré" });
	const key = review.locator(".mdq-choice", { hasText: "densidade" });
	await expect(picked).toHaveAttribute("data-key", "incorrect");
	await expect(key).toHaveAttribute("data-key", "correct");
	await expect(review).toContainText("pororoca");
});

test("an invalid source lists its diagnostics", async ({ page }) => {
	await page.goto("/#/local/long-stem");
	await page.getByTestId("source").fill("---\nid: [\n---\n");
	await expect(page.getByTestId("diagnostics")).toBeVisible();
	await expect(page.getByTestId("mode-answer")).toHaveCount(0);
});

test("every corpus question renders without a page error", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	const links = await page
		.locator(".sidebar a")
		.evaluateAll((items) =>
			items.map((item) => item.getAttribute("href") ?? ""),
		);
	expect(links.length).toBeGreaterThan(0);
	for (const href of links) {
		await page.goto(`/${href}`);
		await expect(page.getByTestId("mode-answer")).toBeVisible();
	}
	expect(errors).toEqual([]);
});
