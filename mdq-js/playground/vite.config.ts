import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const src = fileURLToPath(new URL("../src", import.meta.url));
const repo = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
	plugins: [solid()],
	resolve: {
		// Reads the components from `src/`, not from `dist/`: an edit shows up
		// at once, with no `tsc` step.
		alias: {
			"@mdq/": `${src}/`,
			"@mdq": `${src}/index.ts`,
		},
		// `src/` resolves `solid-js` from `mdq-js/node_modules`, the app from
		// `playground/node_modules`. Two copies break reactivity.
		dedupe: ["solid-js"],
	},
	server: {
		port: 5180,
		strictPort: true,
		// `src/` and the shared corpus in `examples/` are outside this folder.
		fs: { allow: [repo] },
	},
});
