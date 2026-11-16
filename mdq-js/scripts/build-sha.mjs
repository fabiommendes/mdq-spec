// Writes dist/.build-sha: the commit SHA of HEAD, plus "-dirty" when mdq-js/
// has uncommitted changes. Writes "unknown" outside a git checkout.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
	return execFileSync("git", args, {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
	});
}

let stamp = "unknown";
try {
	const sha = git("rev-parse", "HEAD").trim();
	const dirty = git("status", "--porcelain", "--", ".").trim() !== "";
	stamp = dirty ? `${sha}-dirty` : sha;
} catch {
	// Not a git checkout, or git is not installed.
}

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", ".build-sha"), `${stamp}\n`);
