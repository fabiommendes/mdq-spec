import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@mdq/": `${src}/`,
			"@mdq": `${src}/index.ts`,
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.{test,spec}.{ts,tsx}"],
	},
});
