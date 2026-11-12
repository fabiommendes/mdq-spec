// Bundles the extension and the preview webview with mdq-js, read from its
// sources in the sibling directory, and copies the schema bundle of the
// repository root and the stylesheets.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const here = dirname(fileURLToPath(import.meta.url));
const mdqSrc = join(here, "..", "mdq-js", "src");
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

rmSync(join(here, "dist"), { recursive: true, force: true });
mkdirSync(join(here, "dist"), { recursive: true });
for (const [from, to] of [
	[join(here, "..", "schema", "mdq.schema.json"), "mdq.schema.json"],
	[join(here, "..", "mdq-js", "css", "plain.css"), "plain.css"],
	[join(here, "src", "webview", "preview.css"), "webview.css"],
]) {
	copyFileSync(from, join(here, "dist", to));
}

const alias = {
	"@mdq-format/core": join(mdqSrc, "index.ts"),
	"@mdq-format/core/solid": join(mdqSrc, "solid", "index.ts"),
};

// mdq-js sources import `solid-js` from mdq-js/node_modules. Two copies
// break reactivity, so every import resolves from this package.
const oneSolid = {
	name: "one-solid",
	setup(build) {
		build.onResolve({ filter: /^solid-js(\/.*)?$/ }, (args) => {
			if (args.pluginData || args.resolveDir.startsWith(here)) return undefined;
			return build.resolve(args.path, {
				kind: args.kind,
				resolveDir: here,
				pluginData: true,
			});
		});
	},
};

const common = {
	bundle: true,
	alias,
	sourcemap: !production,
	minify: production,
	logLevel: "info",
};

const contexts = await Promise.all([
	esbuild.context({
		...common,
		entryPoints: [join(here, "src", "extension.ts")],
		outfile: join(here, "dist", "extension.cjs"),
		format: "cjs",
		platform: "node",
		target: "node20",
		external: ["vscode"],
	}),
	esbuild.context({
		...common,
		entryPoints: [join(here, "src", "webview", "main.tsx")],
		outfile: join(here, "dist", "webview.js"),
		format: "iife",
		platform: "browser",
		target: "es2022",
		plugins: [oneSolid, solidPlugin()],
	}),
]);

if (watch) {
	await Promise.all(contexts.map((context) => context.watch()));
} else {
	await Promise.all(contexts.map((context) => context.rebuild()));
	await Promise.all(contexts.map((context) => context.dispose()));
}
