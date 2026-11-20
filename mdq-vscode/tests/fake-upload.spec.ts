import { describe, expect, it } from "vitest";
import { withFile, withoutFile } from "../src/webview/fake-upload.js";

const a = { name: "a.txt", path: "a.txt", size: 1 };
const b = { name: "b.txt", path: "b.txt", size: 2 };

describe("withFile", () => {
	it("appends a new name", () => {
		expect(withFile([a], { name: "b.txt", size: 2 })).toEqual([a, b]);
	});
	it("starts a list from nothing", () => {
		expect(withFile(undefined, { name: "a.txt", size: 1 })).toEqual([a]);
		expect(withFile(null, { name: "a.txt", size: 1 })).toEqual([a]);
	});
	it("replaces the item of the same name in place", () => {
		expect(withFile([a, b], { name: "a.txt", size: 9 })).toEqual([
			{ ...a, size: 9 },
			b,
		]);
	});
	it("does not mutate its input", () => {
		const list = [a];
		withFile(list, { name: "b.txt", size: 2 });
		expect(list).toEqual([a]);
	});
});

describe("withoutFile", () => {
	it("drops the named item", () => {
		expect(withoutFile([a, b], "a.txt")).toEqual([b]);
	});
	it("ignores an unknown name and an empty list", () => {
		expect(withoutFile([a], "x")).toEqual([a]);
		expect(withoutFile(null, "x")).toEqual([]);
	});
});
