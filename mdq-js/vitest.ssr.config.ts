import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	// Compiles the components of `src/solid/` for server rendering, the way an
	// SSR consumer such as Astro does.
	plugins: [solid({ ssr: true, solid: { generate: "ssr", hydratable: true } })],
	resolve: {
		alias: {
			"@mdq/": `${src}/`,
			"@mdq": `${src}/index.ts`,
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.ssr.spec.tsx"],
	},
});
