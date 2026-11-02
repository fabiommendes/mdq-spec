import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Playwright's own Chromium does not run on every Linux distribution. Use the
// system Chromium when there is one, or set `CHROMIUM` to another binary.
const system = process.env.CHROMIUM ?? "/usr/bin/chromium";
const executablePath = existsSync(system) ? system : undefined;

export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://localhost:5180",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
		},
	],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:5180",
		reuseExistingServer: !process.env.CI,
	},
});
