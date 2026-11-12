import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@mdq-format/core": fileURLToPath(
				new URL("../mdq-js/src/index.ts", import.meta.url),
			),
		},
	},
});
