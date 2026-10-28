import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	// Compiles the components of `src/solid/`. Their tests opt into jsdom
	// with a `@vitest-environment` comment; the rest stays on node.
	plugins: [solid()],
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
