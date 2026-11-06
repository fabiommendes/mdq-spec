/**
 * The preview panel: one webview that shows the MDQ document of the active
 * editor, and follows the editor when another MDQ document becomes active.
 *
 * The webview bundle (`dist/webview.js`, from `src/webview/`) loads the
 * document itself; this module only sends the text, on open, on each change
 * (debounced) and when the panel asks for it.
 */

import * as vscode from "vscode";
import type { Format } from "./documents.js";
import {
	localeOf,
	type ReadyMessage,
	type ShowMessage,
} from "./webview/protocol.js";

const VIEW_TYPE = "mdq.preview";

/** The format of a document, or `undefined` if it is not MDQ. */
type FormatOf = (document: vscode.TextDocument) => Format | undefined;

/** Wait this long after the last keystroke before sending the text again. */
const DEBOUNCE_MS = 250;

export class PreviewPanel {
	private static current: PreviewPanel | undefined;

	private document: vscode.TextDocument;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private readonly disposables: vscode.Disposable[] = [];

	/** Show the preview of `document`, creating the panel if needed. */
	static show(
		context: vscode.ExtensionContext,
		document: vscode.TextDocument,
		column: vscode.ViewColumn,
		formatOf: FormatOf,
	): void {
		if (PreviewPanel.current !== undefined) {
			PreviewPanel.current.panel.reveal(column, true);
			PreviewPanel.current.follow(document);
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			VIEW_TYPE,
			"MDQ Preview",
			{ viewColumn: column, preserveFocus: true },
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist")],
			},
		);
		PreviewPanel.current = new PreviewPanel(context, panel, document, formatOf);
	}

	private constructor(
		context: vscode.ExtensionContext,
		private readonly panel: vscode.WebviewPanel,
		document: vscode.TextDocument,
		private readonly formatOf: FormatOf,
	) {
		this.document = document;
		panel.webview.html = page(panel.webview, context.extensionUri);
		this.updateTitle();
		this.disposables.push(
			panel.onDidDispose(() => this.dispose()),
			panel.webview.onDidReceiveMessage((message: ReadyMessage) => {
				if (message.type === "ready") this.send();
			}),
			vscode.workspace.onDidChangeTextDocument((event) => {
				if (event.document === this.document) this.sendLater();
			}),
			vscode.window.onDidChangeActiveTextEditor((editor) => {
				if (
					editor !== undefined &&
					this.formatOf(editor.document) !== undefined
				) {
					this.follow(editor.document);
				}
			}),
		);
	}

	private follow(document: vscode.TextDocument): void {
		if (document === this.document) return;
		this.document = document;
		this.updateTitle();
		this.send();
	}

	private updateTitle(): void {
		this.panel.title = `Preview ${baseName(this.document.fileName)}`;
	}

	private sendLater(): void {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.send(), DEBOUNCE_MS);
	}

	private send(): void {
		const format = this.formatOf(this.document);
		if (format === undefined) return;
		const message: ShowMessage = {
			type: "show",
			text: this.document.getText(),
			format,
			name: baseName(this.document.fileName),
			locale: localeOf(vscode.env.language),
		};
		void this.panel.webview.postMessage(message);
	}

	private dispose(): void {
		clearTimeout(this.timer);
		PreviewPanel.current = undefined;
		for (const disposable of this.disposables) disposable.dispose();
	}
}

function baseName(path: string): string {
	return path.split(/[\\/]/).pop() ?? path;
}

/** The HTML of the webview, with a CSP that runs only the bundled script. */
function page(webview: vscode.Webview, root: vscode.Uri): string {
	const asset = (name: string) =>
		webview.asWebviewUri(vscode.Uri.joinPath(root, "dist", name));
	const nonce = randomNonce();
	// Inline styles: a component sets CSS variables in `style` (Ordering).
	const csp = [
		"default-src 'none'",
		`img-src ${webview.cspSource} https: data:`,
		`style-src ${webview.cspSource} 'unsafe-inline'`,
		`script-src 'nonce-${nonce}'`,
	].join("; ");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${asset("plain.css")}">
<link rel="stylesheet" href="${asset("webview.css")}">
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${asset("webview.js")}"></script>
</body>
</html>`;
}

function randomNonce(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}
