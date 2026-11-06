// Bundles the extension with mdq-js, read from its sources in the sibling
// directory, and copies the schema bundle of the repository root.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

rmSync(join(here, "dist"), { recursive: true, force: true });
mkdirSync(join(here, "dist"), { recursive: true });
copyFileSync(
	join(here, "..", "schema", "mdq.schema.json"),
	join(here, "dist", "mdq.schema.json"),
);

const context = await esbuild.context({
	entryPoints: [join(here, "src", "extension.ts")],
	outfile: join(here, "dist", "extension.cjs"),
	bundle: true,
	format: "cjs",
	platform: "node",
	target: "node20",
	external: ["vscode"],
	alias: { mdq: join(here, "..", "mdq-js", "src", "index.ts") },
	sourcemap: !production,
	minify: production,
	logLevel: "info",
});

if (watch) {
	await context.watch();
} else {
	await context.rebuild();
	await context.dispose();
}
