import { Essay } from "@mdq/solid/index.js";
import { renderToString } from "solid-js/web";

function textarea(html: string): string {
	return html.match(/<textarea[^>]*>[\s\S]*?<\/textarea>/)?.[0] ?? "";
}

describe("server rendering", () => {
	it("puts the answer in the textarea as its content", () => {
		const html = renderToString(() => (
			<Essay
				question={{ type: "essay", stem: "S" }}
				value="saved <b>text</b>"
			/>
		));
		const box = textarea(html);
		expect(box).toContain(">saved &lt;b>text&lt;/b></textarea>");
		// A textarea ignores a `value` attribute.
		expect(box).not.toContain("value=");
	});

	it("renders an empty textarea without an answer", () => {
		const html = renderToString(() => (
			<Essay question={{ type: "essay", stem: "S" }} />
		));
		expect(textarea(html)).toMatch(/><\/textarea>$/);
	});
});
