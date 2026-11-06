import { expect, type Locator, type Page, test } from "@playwright/test";

// Story: stories/reorder-by-drag.md

const ROUTE = "/#/local/drag-ordering";

function answer(page: Page): Locator {
	return page.getByTestId("mode-answer");
}

function lines(page: Page, list: "used" | "unused"): Locator {
	return answer(page).locator(`[data-list="${list}"] > li`);
}

async function texts(page: Page, list: "used" | "unused"): Promise<string[]> {
	return lines(page, list).locator(".mdq-ordering-text").allTextContents();
}

/** The response the readonly pane shows, which is what `onChange` reported. */
async function response(page: Page): Promise<string[]> {
	return page
		.getByTestId("mode-readonly")
		.locator('[data-list="response"] > li .mdq-ordering-text')
		.allTextContents();
}

async function center(target: Locator): Promise<{ x: number; y: number }> {
	const box = await target.boundingBox();
	if (box === null) throw new Error("target is not visible");
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses the mouse on `from`, then moves in steps to `to` without letting go. */
async function hold(
	page: Page,
	from: Locator,
	to: { x: number; y: number },
): Promise<void> {
	const start = await center(from);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(to.x, to.y, { steps: 12 });
}

/** A point just above the top edge of `target`, where a drop lands before it. */
async function above(target: Locator): Promise<{ x: number; y: number }> {
	const box = await target.boundingBox();
	if (box === null) throw new Error("target is not visible");
	return { x: box.x + box.width / 2, y: box.y + 2 };
}

test.beforeEach(async ({ page }) => {
	await page.goto(ROUTE);
	await expect(lines(page, "used")).toHaveCount(6);
});

test("dragging a line with the mouse puts it where it is dropped", async ({
	page,
}) => {
	const before = await texts(page, "used");
	const last = lines(page, "used").nth(5);
	await hold(
		page,
		last.locator(".mdq-ordering-text"),
		await above(lines(page, "used").nth(0)),
	);
	await page.mouse.up();

	const expected = [before[5], ...before.slice(0, 5)];
	await expect.poll(() => texts(page, "used")).toEqual(expected);
	await expect.poll(() => response(page)).toEqual(expected);
	await expect(answer(page).locator("output")).toHaveText(
		`${before[5]} moved to position 1 of 6.`,
	);
});

test("a dragged line shows a marker, and the empty unused list shows as a target", async ({
	page,
}) => {
	const first = lines(page, "used").nth(0);
	await hold(
		page,
		first.locator(".mdq-ordering-text"),
		await center(lines(page, "used").nth(3)),
	);

	const root = answer(page).locator(".mdq-question");
	await expect(root).toHaveAttribute("data-dragging", /.*/);
	await expect(first).toHaveAttribute("data-dragging", /.*/);
	await expect(answer(page).locator(".mdq-ordering-drop")).toBeVisible();
	const unused = answer(page).getByRole("region", { name: "Not used" });
	await expect(unused).toBeVisible();
	await expect(unused).toContainText("Drop a line here to leave it out.");

	await page.mouse.up();
	await expect(root).not.toHaveAttribute("data-dragging", /.*/);
	await expect(answer(page).locator(".mdq-ordering-drop")).toHaveCount(0);
});

test("dropping a line on the unused list leaves it out, and dragging it back puts it where it falls", async ({
	page,
}) => {
	const before = await texts(page, "used");
	const unused = answer(page).getByRole("region", { name: "Not used" });

	// The unused list shows only once the drag starts, so find it then.
	const start = await center(
		lines(page, "used").nth(1).locator(".mdq-ordering-text"),
	);
	await hold(page, lines(page, "used").nth(1).locator(".mdq-ordering-text"), {
		x: start.x,
		y: start.y + 12,
	});
	const target = await center(unused);
	await page.mouse.move(target.x, target.y, { steps: 8 });
	await page.mouse.up();

	await expect.poll(() => texts(page, "unused")).toEqual([before[1]]);
	await expect
		.poll(() => texts(page, "used"))
		.toEqual([before[0], ...before.slice(2)]);

	await hold(
		page,
		lines(page, "unused").nth(0).locator(".mdq-ordering-text"),
		await above(lines(page, "used").nth(0)),
	);
	await page.mouse.up();
	await expect
		.poll(() => texts(page, "used"))
		.toEqual([before[1], before[0], ...before.slice(2)]);
	await expect(lines(page, "unused")).toHaveCount(0);
});

test("escape cancels a drag", async ({ page }) => {
	const before = await texts(page, "used");
	await hold(
		page,
		lines(page, "used").nth(0).locator(".mdq-ordering-text"),
		await center(lines(page, "used").nth(4)),
	);
	await page.keyboard.press("Escape");
	await page.mouse.up();

	await expect(answer(page).locator(".mdq-question")).not.toHaveAttribute(
		"data-dragging",
		/.*/,
	);
	expect(await texts(page, "used")).toEqual(before);
	await expect(
		answer(page).getByRole("button", { name: "Keep this order" }),
	).toBeVisible();
});

test("a click that barely moves is not a drag, and the line buttons still click", async ({
	page,
}) => {
	const before = await texts(page, "used");
	const start = await center(
		lines(page, "used").nth(0).locator(".mdq-ordering-text"),
	);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x, start.y + 2);
	await page.mouse.up();
	expect(await texts(page, "used")).toEqual(before);
	await expect(answer(page).locator(".mdq-question")).not.toHaveAttribute(
		"data-dragging",
		/.*/,
	);

	await answer(page)
		.getByRole("button", { name: `Leave out: ${before[2]}` })
		.click();
	await expect.poll(() => texts(page, "unused")).toEqual([before[2]]);
});

test("the page scrolls while a line is held near the bottom of the window", async ({
	page,
}) => {
	await page.setViewportSize({ width: 900, height: 360 });
	await page.evaluate(() => window.scrollTo(0, 0));
	const line = lines(page, "used").nth(0);
	await line.scrollIntoViewIfNeeded();
	const startScroll = await page.evaluate(() => window.scrollY);
	const viewport = page.viewportSize();
	if (viewport === null) throw new Error("no viewport");

	await hold(page, line.locator(".mdq-ordering-text"), {
		x: viewport.width / 2,
		y: viewport.height - 10,
	});
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(startScroll);
	await page.mouse.up();
});

test.describe("touch", () => {
	test.use({ hasTouch: true });

	/** Sends a touch drag from `from` to `to` through the DevTools protocol. */
	async function touchDrag(
		page: Page,
		from: { x: number; y: number },
		to: { x: number; y: number },
	): Promise<void> {
		const cdp = await page.context().newCDPSession(page);
		const point = (x: number, y: number) => [{ x, y, id: 1 }];
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: point(from.x, from.y),
		});
		const steps = 12;
		for (let step = 1; step <= steps; step++) {
			const x = from.x + ((to.x - from.x) * step) / steps;
			const y = from.y + ((to.y - from.y) * step) / steps;
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: point(x, y),
			});
		}
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [],
		});
		await cdp.detach();
	}

	test("a finger moves a line from its handle", async ({ page }) => {
		const before = await texts(page, "used");
		const handle = lines(page, "used").nth(5).locator(".mdq-ordering-grip");
		await touchDrag(
			page,
			await center(handle),
			await above(lines(page, "used").nth(0)),
		);

		await expect
			.poll(() => texts(page, "used"))
			.toEqual([before[5], ...before.slice(0, 5)]);
	});

	test("a finger on the text of a line does not move it", async ({ page }) => {
		const before = await texts(page, "used");
		const text = lines(page, "used").nth(5).locator(".mdq-ordering-text");
		await touchDrag(
			page,
			await center(text),
			await above(lines(page, "used").nth(0)),
		);

		await page.waitForTimeout(200);
		expect(await texts(page, "used")).toEqual(before);
	});
});
