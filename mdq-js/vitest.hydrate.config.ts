import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	// Compiles the components for the DOM with hydration keys, the way a
	// browser bundle of an SSR page does. The server HTML they hydrate comes
	// from `tests/solid/hydration.setup.ts`.
	plugins: [solid({ solid: { generate: "dom", hydratable: true } })],
	resolve: {
		alias: {
			"@mdq/": `${src}/`,
			"@mdq": `${src}/index.ts`,
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		include: ["tests/**/*.hydrate.spec.tsx"],
		globalSetup: ["tests/solid/hydration.setup.ts"],
	},
});
