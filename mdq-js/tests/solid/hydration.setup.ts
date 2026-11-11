import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import type { TestProject } from "vitest/node";
import { createServer } from "vitest/node";

const src = fileURLToPath(new URL("../../src", import.meta.url));
const cases = fileURLToPath(new URL("./hydration.cases.tsx", import.meta.url));

declare module "vitest" {
	export interface ProvidedContext {
		/** The server HTML of each case in `hydration.cases.tsx`, by case name. */
		serverHtml: Record<string, string>;
	}
}

/**
 * Renders every case on the server and hands the HTML to the specs.
 *
 * The specs compile the components for the DOM, and a compilation is per
 * file, so the server render goes through a Vite server of its own, with the
 * components compiled for SSR. The HTML is rendered on each run, so it cannot
 * go stale.
 */
export async function setup(
	project: TestProject,
): Promise<() => Promise<void>> {
	const server = await createServer({
		configFile: false,
		appType: "custom",
		logLevel: "error",
		server: { middlewareMode: true, hmr: false, watch: null },
		plugins: [
			solid({ ssr: true, solid: { generate: "ssr", hydratable: true } }),
		],
		resolve: {
			alias: { "@mdq/": `${src}/`, "@mdq": `${src}/index.ts` },
		},
	});
	try {
		const module = await server.ssrLoadModule(cases);
		const { renderToString } = await server.ssrLoadModule("solid-js/web");
		const html: Record<string, string> = {};
		for (const [name, { view, answer }] of Object.entries(module.cases) as [
			string,
			{ view: string; answer: string },
		][]) {
			html[name] = renderToString(() => module.views[view](() => answer));
		}
		project.provide("serverHtml", html);
	} finally {
		await server.close();
	}
	return async () => {};
}
