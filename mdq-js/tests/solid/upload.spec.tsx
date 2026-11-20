// @vitest-environment jsdom

import type { PublicUploadQuestion, UploadFile } from "@mdq/index.js";
import { type HostResult, Upload } from "@mdq/solid/index.js";
import { jitter } from "@mdq/solid/Upload.jsx";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicUploadQuestion = {
	type: "upload",
	id: "report",
	stem: "Send the *report*.",
	maxFiles: 2,
	maxSize: "1 KB",
	extensions: [".pdf", ".png"],
};

const single: PublicUploadQuestion = { type: "upload", stem: "One file." };

const stored = (name: string, size = 100): UploadFile => ({
	name,
	path: `up/${name}`,
	size,
});

function file(name: string, size = 10): File {
	const found = new File(["x"], name);
	Object.defineProperty(found, "size", { value: size });
	return found;
}

function input(): HTMLInputElement {
	return document.querySelector("input[type=file]") as HTMLInputElement;
}

function choose(...files: File[]): void {
	fireEvent.change(input(), { target: { files } });
}

function status(): string {
	return document.querySelector(".mdq-upload-status")?.textContent ?? "";
}

function names(): string[] {
	return [...document.querySelectorAll(".mdq-upload-file")].map(
		(row) => row.querySelector(".mdq-upload-name")?.textContent ?? "",
	);
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

const ok = (...files: UploadFile[]): HostResult<readonly UploadFile[]> => ({
	ok: true,
	value: files,
});

const busy = (retryAfterMs?: number): HostResult<readonly UploadFile[]> => ({
	ok: false,
	busy: true,
	retryAfterMs,
});

beforeEach(() => {
	vi.useFakeTimers();
	jitter.random = () => 0;
});

afterEach(() => {
	jitter.random = Math.random;
	vi.useRealTimers();
});

describe("answer mode", () => {
	it("renders a file input with the limits of the question", () => {
		render(() => <Upload question={question} upload={async () => ok()} />);
		const chooser = input();
		expect(chooser.multiple).toBe(true);
		expect(chooser.getAttribute("accept")).toBe(".pdf,.png");
		expect(chooser.disabled).toBe(false);
		expect(
			document.querySelector(".mdq-question")?.getAttribute("data-type"),
		).toBe("upload");
		expect(document.querySelector(".mdq-upload-limits")?.textContent).toBe(
			"Up to 2 files; 1 KB each; accepted: .pdf, .png.",
		);
	});

	it("formats an integer maxSize and takes one file by default", () => {
		render(() => (
			<Upload
				question={{ ...single, maxSize: 1536 }}
				upload={async () => ok()}
			/>
		));
		expect(input().multiple).toBe(false);
		expect(input().hasAttribute("accept")).toBe(false);
		expect(document.querySelector(".mdq-upload-limits")?.textContent).toBe(
			"Up to 1 file; 1.5 KB each.",
		);
	});

	it("disables the input without a host", () => {
		render(() => <Upload question={question} />);
		expect(input().disabled).toBe(true);
	});

	it("lists the files with size and link, and no link without fileUrl", () => {
		render(() => (
			<Upload
				question={question}
				value={[stored("a.pdf", 2048)]}
				upload={async () => ok()}
				fileUrl={(f) => `/files/${f.name}`}
			/>
		));
		const row = document.querySelector(".mdq-upload-file") as HTMLElement;
		expect(row.getAttribute("data-state")).toBe("stored");
		expect(row.textContent).toContain("2.0 KB");
		expect(
			screen.getByRole("link", { name: "a.pdf" }).getAttribute("href"),
		).toBe("/files/a.pdf");
	});

	it("has no link when fileUrl gives null, and no remove button without remove", () => {
		render(() => (
			<Upload
				question={question}
				value={[stored("a.pdf")]}
				upload={async () => ok()}
				fileUrl={() => null}
			/>
		));
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.queryByRole("button")).toBeNull();
	});
});

describe("refusals before the host", () => {
	it("refuses a file that is too large", async () => {
		const upload = vi.fn(async () => ok());
		render(() => <Upload question={question} upload={upload} />);
		choose(file("big.pdf", 2000));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).not.toHaveBeenCalled();
		expect(document.querySelector(".mdq-upload-file")?.textContent).toContain(
			"big.pdf is larger than 1 KB.",
		);
		expect(status()).toContain("big.pdf is larger than 1 KB.");
	});

	it("states the limit of an integer maxSize formatted", async () => {
		const upload = vi.fn(async () => ok());
		render(() => (
			<Upload question={{ ...single, maxSize: 2048 }} upload={upload} />
		));
		choose(file("a.txt", 3000));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).not.toHaveBeenCalled();
		expect(status()).toBe("a.txt is larger than 2.0 KB.");
	});

	it("refuses an extension that is not accepted", async () => {
		const upload = vi.fn(async () => ok());
		render(() => <Upload question={question} upload={upload} />);
		choose(file("notes.txt"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).not.toHaveBeenCalled();
		expect(status()).toBe("notes.txt is not an accepted type (.pdf, .png).");
	});

	it("checks the extension of the normalized name", async () => {
		const upload = vi.fn(async () => ok(stored("report.pdf")));
		render(() => (
			<Upload
				question={question}
				upload={upload}
				normalizeName={(name) => `${name.replace(/ /g, "-")}.pdf`}
			/>
		));
		choose(file("report"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
	});

	it("refuses a file that would exceed maxFiles, counting the same selection", async () => {
		const upload = vi.fn(async (f: File) => ok(stored(f.name)));
		render(() => (
			<Upload question={question} value={[stored("a.pdf")]} upload={upload} />
		));
		choose(file("b.pdf"), file("c.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
		expect(upload.mock.calls[0]?.[0].name).toBe("b.pdf");
		expect(
			document.querySelector('.mdq-upload-file[data-state="error"]')
				?.textContent,
		).toContain("Only 2 files are allowed.");
	});

	it("sends a file that replaces one by name even with the list full", async () => {
		const upload = vi.fn(async () => ok(stored("a.pdf", 5), stored("b.pdf")));
		render(() => (
			<Upload
				question={question}
				value={[stored("a.pdf"), stored("b.pdf")]}
				upload={upload}
			/>
		));
		choose(file("a.pdf", 5));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
	});

	it("replaces by the normalized name", async () => {
		const upload = vi.fn(async () => ok(stored("a.pdf"), stored("b.pdf")));
		render(() => (
			<Upload
				question={question}
				value={[stored("a.pdf"), stored("b.pdf")]}
				upload={upload}
				normalizeName={(name) => name.toLowerCase()}
			/>
		));
		choose(file("A.PDF"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
	});
});

describe("uploads", () => {
	it("runs strictly in series", async () => {
		const first = deferred<HostResult<readonly UploadFile[]>>();
		const second = deferred<HostResult<readonly UploadFile[]>>();
		const gates = [first, second];
		const upload = vi.fn(() => (gates.shift() as typeof first).promise);
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
		expect(status()).toBe("Sending a.pdf…");
		first.resolve(ok(stored("a.pdf")));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(upload.mock.calls[1]?.[0].name).toBe("b.pdf");
		second.resolve(ok(stored("a.pdf"), stored("b.pdf")));
		await vi.advanceTimersByTimeAsync(0);
		expect(names()).toEqual(["a.pdf", "b.pdf"]);
	});

	it("serializes a second selection after the first", async () => {
		const first = deferred<HostResult<readonly UploadFile[]>>();
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockReturnValueOnce(first.promise)
			.mockResolvedValue(ok());
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		choose(file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
		first.resolve(ok(stored("a.pdf")));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(2);
	});

	it("adopts the whole list the host returns and reports it", async () => {
		const seen: (readonly UploadFile[] | null)[] = [];
		const upload = vi.fn(async () => ok(stored("a.pdf"), stored("old.png")));
		render(() => (
			<Upload
				question={question}
				upload={upload}
				onChange={(files) => seen.push(files)}
			/>
		));
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(names()).toEqual(["a.pdf", "old.png"]);
		expect(seen).toEqual([[stored("a.pdf"), stored("old.png")]]);
	});

	it("follows value when the parent controls it", async () => {
		const [value, setValue] = createSignal<readonly UploadFile[] | null>(null);
		render(() => (
			<Upload
				question={question}
				value={value()}
				onChange={setValue}
				upload={async () => ok(stored("a.pdf"))}
			/>
		));
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(value()).toEqual([stored("a.pdf")]);
		expect(names()).toEqual(["a.pdf"]);
	});

	it("shows the refusal of the host next to the file and goes on", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce({ ok: false, message: "Virus found." })
			.mockResolvedValueOnce(ok(stored("b.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(2);
		const failed = document.querySelector(
			'.mdq-upload-file[data-state="error"]',
		) as HTMLElement;
		expect(failed.textContent).toContain("a.pdf");
		expect(failed.textContent).toContain("Virus found.");
		expect(
			document.querySelector(".mdq-upload-status")?.getAttribute("aria-live"),
		).toBe("polite");
	});

	it("shows a generic failure when the promise rejects, and goes on", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce(ok(stored("b.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(
			document.querySelector('.mdq-upload-file[data-state="error"]')
				?.textContent,
		).toContain("Could not send a.pdf. Try again.");
	});
});

describe("busy host", () => {
	it("retries after 1 s, 2 s, 4 s, 8 s and 16 s and succeeds", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValue(busy());
		upload.mockResolvedValueOnce(busy());
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
		expect(status()).toBe("The server is busy. Sending a.pdf again in 1 s…");
		await vi.advanceTimersByTimeAsync(999);
		expect(upload).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(status()).toContain("in 2 s");
		await vi.advanceTimersByTimeAsync(1000);
		expect(status()).toContain("in 1 s");
		await vi.advanceTimersByTimeAsync(1000);
		expect(upload).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(4000);
		expect(upload).toHaveBeenCalledTimes(4);
		await vi.advanceTimersByTimeAsync(8000);
		expect(upload).toHaveBeenCalledTimes(5);
		upload.mockResolvedValueOnce(ok(stored("a.pdf")));
		await vi.advanceTimersByTimeAsync(16000);
		expect(upload).toHaveBeenCalledTimes(6);
		expect(names()).toEqual(["a.pdf"]);
	});

	it("honours retryAfterMs", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce(busy(3000))
			.mockResolvedValueOnce(ok(stored("a.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(status()).toContain("in 3 s");
		await vi.advanceTimersByTimeAsync(2999);
		expect(upload).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(2);
	});

	it("gives up after 6 tries and goes on with the next file", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockImplementation(async (f) =>
				f.name === "a.pdf" ? busy() : ok(stored("b.pdf")),
			);
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000 + 16000);
		const calls = upload.mock.calls.map(([f]) => f.name);
		expect(calls).toEqual([
			"a.pdf",
			"a.pdf",
			"a.pdf",
			"a.pdf",
			"a.pdf",
			"a.pdf",
			"b.pdf",
		]);
		expect(
			document.querySelector('.mdq-upload-file[data-state="error"]')
				?.textContent,
		).toContain("Could not send a.pdf. Try again.");
		expect(names()).toContain("b.pdf");
	});
});

describe("robustness", () => {
	it("reports the list a host stored even after unmount, and drops the rest of the queue", async () => {
		const gate = deferred<HostResult<readonly UploadFile[]>>();
		const upload = vi.fn(() => gate.promise);
		const seen: (readonly UploadFile[] | null)[] = [];
		const { unmount } = render(() => (
			<Upload
				question={question}
				upload={upload}
				onChange={(files) => seen.push(files)}
			/>
		));
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		unmount();
		gate.resolve(ok(stored("a.pdf")));
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual([[stored("a.pdf")]]);
		expect(upload).toHaveBeenCalledTimes(1);
	});

	it("clamps retryAfterMs to 1 s and 30 s", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce(busy(5))
			.mockResolvedValueOnce(busy(600000))
			.mockResolvedValue(ok(stored("a.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(999);
		expect(upload).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(29999);
		expect(upload).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(3);
	});

	it.each([
		0,
		-5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	])("falls back to the exponential backoff for retryAfterMs %s", async (bad) => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce(busy(bad))
			.mockResolvedValueOnce(busy(bad))
			.mockResolvedValue(ok(stored("a.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(999);
		expect(upload).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1999);
		expect(upload).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(3);
	});

	it("adds up to 50% of jitter to every wait", async () => {
		jitter.random = () => 1;
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce(busy())
			.mockResolvedValueOnce(busy())
			.mockResolvedValue(ok(stored("a.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(1499);
		expect(upload).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(2999);
		expect(upload).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(upload).toHaveBeenCalledTimes(3);
	});

	it("keeps the queue going when onChange throws", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce(ok(stored("a.pdf")))
			.mockResolvedValueOnce(ok(stored("a.pdf"), stored("b.pdf")));
		const onChange = vi.fn(() => {
			throw new Error("host bug");
		});
		render(() => (
			<Upload question={question} upload={upload} onChange={onChange} />
		));
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(names()).toEqual(["a.pdf", "b.pdf"]);
	});

	it("keeps the queue going when upload throws synchronously", async () => {
		const upload = vi
			.fn<(f: File) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockImplementationOnce(() => {
				throw new Error("sync");
			})
			.mockResolvedValueOnce(ok(stored("b.pdf")));
		render(() => <Upload question={question} upload={upload} />);
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(names()).toContain("b.pdf");
	});

	it("announces a stored file", async () => {
		render(() => (
			<Upload question={question} upload={async () => ok(stored("a.pdf"))} />
		));
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		expect(status()).toBe("a.pdf uploaded.");
	});

	it("shows text on a queued row", async () => {
		const gate = deferred<HostResult<readonly UploadFile[]>>();
		render(() => <Upload question={question} upload={() => gate.promise} />);
		choose(file("a.pdf"), file("b.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		const rows = [...document.querySelectorAll(".mdq-upload-file")];
		expect(rows[0]?.textContent).toContain("Sending a.pdf…");
		expect(rows[1]?.getAttribute("data-state")).toBe("queued");
		expect(rows[1]?.textContent).toContain("Queued: b.pdf");
	});

	it("treats an invalid maxSize as no limit", async () => {
		const upload = vi.fn(async () => ok(stored("a.pdf")));
		render(() => (
			<Upload question={{ ...single, maxSize: "lots" }} upload={upload} />
		));
		choose(file("a.pdf", 10 ** 9));
		await vi.advanceTimersByTimeAsync(0);
		expect(upload).toHaveBeenCalledTimes(1);
	});
});

describe("removal", () => {
	it("calls the host and adopts the list", async () => {
		const seen: (readonly UploadFile[] | null)[] = [];
		const remove = vi.fn(async (_name: string) => ok(stored("b.pdf")));
		const [value, setValue] = createSignal<readonly UploadFile[] | null>([
			stored("a.pdf"),
			stored("b.pdf"),
		]);
		render(() => (
			<Upload
				question={question}
				value={value()}
				remove={remove}
				onChange={(files) => {
					seen.push(files);
					setValue(files);
				}}
			/>
		));
		fireEvent.click(screen.getByRole("button", { name: "Remove a.pdf" }));
		await vi.advanceTimersByTimeAsync(0);
		expect(remove).toHaveBeenCalledWith("a.pdf");
		expect(names()).toEqual(["b.pdf"]);
		expect(seen).toEqual([[stored("b.pdf")]]);
	});

	it("removes a file, announces it, and reports null for an empty list", async () => {
		const seen: (readonly UploadFile[] | null)[] = [];
		const remove = vi.fn(async (_name: string) => ok());
		render(() => (
			<Upload
				question={single}
				upload={async () => ok(stored("a.pdf"))}
				remove={remove}
				onChange={(files) => seen.push(files)}
			/>
		));
		choose(file("a.pdf"));
		await vi.advanceTimersByTimeAsync(0);
		fireEvent.click(screen.getByRole("button", { name: "Remove a.pdf" }));
		await vi.advanceTimersByTimeAsync(0);
		expect(remove).toHaveBeenCalledWith("a.pdf");
		expect(names()).toEqual([]);
		expect(seen.at(-1)).toBeNull();
		expect(status()).toBe("a.pdf removed.");
	});

	it("retries a busy removal and queues it behind uploads", async () => {
		const seen: (readonly UploadFile[] | null)[] = [];
		const gate = deferred<HostResult<readonly UploadFile[]>>();
		const upload = vi.fn(() => gate.promise);
		const remove = vi
			.fn<(name: string) => Promise<HostResult<readonly UploadFile[]>>>()
			.mockResolvedValueOnce(busy())
			.mockResolvedValueOnce(ok(stored("b.pdf")));
		render(() => (
			<Upload
				question={question}
				value={[stored("a.pdf"), stored("b.pdf")]}
				upload={upload}
				remove={remove}
				onChange={(files) => seen.push(files)}
			/>
		));
		choose(file("a.pdf", 1));
		await vi.advanceTimersByTimeAsync(0);
		fireEvent.click(screen.getByRole("button", { name: "Remove a.pdf" }));
		await vi.advanceTimersByTimeAsync(0);
		expect(remove).not.toHaveBeenCalled();
		gate.resolve(ok(stored("a.pdf"), stored("b.pdf")));
		await vi.advanceTimersByTimeAsync(0);
		expect(remove).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1000);
		expect(remove).toHaveBeenCalledTimes(2);
		expect(seen.at(-1)).toEqual([stored("b.pdf")]);
	});
});

describe("readonly and review", () => {
	const files = [stored("a.pdf", 1048576), stored("b.png", 12)];

	it("lists name, size and link, with no input", () => {
		render(() => (
			<Upload
				question={question}
				value={files}
				mode="readonly"
				fileUrl={(f) => `/f/${f.name}`}
			/>
		));
		expect(input()).toBeNull();
		expect(names()).toEqual(["a.pdf", "b.png"]);
		const text = document.querySelector(".mdq-upload-files")?.textContent;
		expect(text).toContain("1.0 MB");
		expect(text).toContain("12 B");
		expect(
			screen.getByRole("link", { name: "b.png" }).getAttribute("href"),
		).toBe("/f/b.png");
		expect(
			document.querySelector(".mdq-question")?.getAttribute("data-mode"),
		).toBe("readonly");
	});

	it("says there is no answer when empty", () => {
		render(() => <Upload question={question} value={null} mode="readonly" />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});

	it("shows the pending badge and the answer key in review", () => {
		render(() => (
			<Upload
				question={question}
				value={files}
				mode="review"
				result={{ pending: true }}
				answerKey="Look for **the cycle**."
			/>
		));
		const badge = document.querySelector(".mdq-score");
		expect(badge?.getAttribute("data-sign")).toBe("pending");
		expect(badge?.textContent).toBe("Awaiting grading");
		expect(
			screen.getByRole("region", { name: "Model answer" }).textContent,
		).toContain("the cycle");
		expect(input()).toBeNull();
	});

	it("shows the score, and no key when it is blank or withheld", () => {
		render(() => (
			<Upload
				question={question}
				value={files}
				mode="review"
				result={{ score: 0.5, feedback: [] }}
				answerKey="  "
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 0.50",
		);
		expect(screen.queryByRole("region", { name: "Model answer" })).toBeNull();
	});

	it("hides the badge with hideScore", () => {
		render(() => (
			<Upload
				question={question}
				value={files}
				mode="review"
				result={{ pending: true }}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
	});
});

describe("messages", () => {
	it("speaks Brazilian Portuguese through locale", async () => {
		render(() => (
			<Upload
				question={question}
				locale="pt-BR"
				value={[stored("a.pdf", 1536)]}
				upload={async () => ok()}
			/>
		));
		expect(document.querySelector(".mdq-upload-limits")?.textContent).toBe(
			"No máximo 2 arquivos; 1 KB cada; aceitos: .pdf, .png.",
		);
		expect(document.querySelector(".mdq-upload-file")?.textContent).toContain(
			"1,5 KB",
		);
		choose(file("x.txt"));
		await vi.advanceTimersByTimeAsync(0);
		expect(status()).toBe("x.txt não é de um tipo aceito (.pdf, .png).");
	});

	it("formats sizes in powers of 1024", async () => {
		const { en } = await import("@mdq/solid/index.js");
		expect(en.fileSize(0)).toBe("0 B");
		expect(en.fileSize(1023)).toBe("1023 B");
		expect(en.fileSize(1024)).toBe("1.0 KB");
		expect(en.fileSize(5 * 1024 ** 2)).toBe("5.0 MB");
		expect(en.fileSize(1024 ** 3)).toBe("1.0 GB");
	});
});
