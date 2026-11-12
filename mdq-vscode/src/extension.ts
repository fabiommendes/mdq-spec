/**
 * Entry point of the MDQ extension: diagnostics and preview of MDQ documents.
 *
 * Every open MDQ document (see `documents.ts`) is loaded with mdq-js on open
 * and on each change, and its diagnostics go to the editor and the Problems
 * panel. The JSON Schema registration (completion and hover in YAML and JSON)
 * is in `package.json`, not here. The preview is in `preview.ts`.
 */

import { load, type Diagnostic as MdqDiagnostic } from "@mdq-format/core";
import * as vscode from "vscode";
import { type Format, mdqFormat } from "./documents.js";
import { PreviewPanel } from "./preview.js";
import { editorRange } from "./ranges.js";

/** Where the codes of the diagnostics are explained. */
const LINT_CODES_URL = vscode.Uri.parse(
	"https://github.com/fabiommendes/mdq-spec/blob/main/docs/lint-codes.md",
);

/** Wait this long after the last keystroke before loading the document again. */
const DEBOUNCE_MS = 250;

/** How an `info` diagnostic is shown: setting `mdq.diagnostics.info`. */
type InfoDisplay = "information" | "hint" | "off";

export function activate(context: vscode.ExtensionContext): void {
	const collection = vscode.languages.createDiagnosticCollection("mdq");
	const timers = new Map<string, ReturnType<typeof setTimeout>>();

	// The menus and the key binding of the preview show for an MDQ editor.
	const updateContext = () => {
		const editor = vscode.window.activeTextEditor;
		const isMdq =
			editor !== undefined && formatOf(editor.document) !== undefined;
		void vscode.commands.executeCommand("setContext", "mdq.isMdqEditor", isMdq);
	};

	const refresh = (document: vscode.TextDocument) => {
		const format = formatOf(document);
		if (document === vscode.window.activeTextEditor?.document) updateContext();
		// A document leaves MDQ when its language or its frontmatter changes.
		if (format === undefined) {
			collection.delete(document.uri);
			return;
		}
		const { diagnostics } = load(document.getText(), { format });
		collection.set(document.uri, toEditorDiagnostics(diagnostics, document));
	};

	const refreshLater = (document: vscode.TextDocument) => {
		const key = document.uri.toString();
		clearTimeout(timers.get(key));
		timers.set(
			key,
			setTimeout(() => {
				timers.delete(key);
				refresh(document);
			}, DEBOUNCE_MS),
		);
	};

	context.subscriptions.push(
		collection,
		vscode.workspace.onDidOpenTextDocument(refresh),
		vscode.workspace.onDidChangeTextDocument((event) =>
			refreshLater(event.document),
		),
		vscode.workspace.onDidCloseTextDocument((document) => {
			clearTimeout(timers.get(document.uri.toString()));
			collection.delete(document.uri);
		}),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration("mdq")) {
				vscode.workspace.textDocuments.forEach(refresh);
			}
		}),
		vscode.window.onDidChangeActiveTextEditor(updateContext),
	);
	vscode.workspace.textDocuments.forEach(refresh);
	updateContext();

	const preview = (column: vscode.ViewColumn) => () => {
		const editor = vscode.window.activeTextEditor;
		if (editor === undefined || formatOf(editor.document) === undefined) {
			void vscode.window.showInformationMessage(
				"Open an MDQ document to preview it.",
			);
			return;
		}
		PreviewPanel.show(context, editor.document, column, formatOf);
	};
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"mdq.showPreview",
			preview(vscode.ViewColumn.Active),
		),
		vscode.commands.registerCommand(
			"mdq.showPreviewToSide",
			preview(vscode.ViewColumn.Beside),
		),
	);
}

export function deactivate(): void {}

/** The format of `document`, or `undefined` if it is not MDQ (`documents.ts`). */
function formatOf(document: vscode.TextDocument): Format | undefined {
	return mdqFormat(document, inMdqFiles(document));
}

/**
 * Whether a glob of the setting `mdq.files` matches `document`. A glob is
 * relative to the workspace folder of the document.
 */
function inMdqFiles(document: vscode.TextDocument): boolean {
	const globs = vscode.workspace
		.getConfiguration("mdq", document.uri)
		.get<string[]>("files", []);
	if (globs.length === 0) return false;
	const folder = vscode.workspace.getWorkspaceFolder(document.uri);
	return globs.some(
		(glob) =>
			vscode.languages.match(
				{ pattern: folder ? new vscode.RelativePattern(folder, glob) : glob },
				document,
			) > 0,
	);
}

function toEditorDiagnostics(
	diagnostics: readonly MdqDiagnostic[],
	document: vscode.TextDocument,
): vscode.Diagnostic[] {
	const info = vscode.workspace
		.getConfiguration("mdq")
		.get<InfoDisplay>("diagnostics.info", "hint");
	const result: vscode.Diagnostic[] = [];
	for (const found of diagnostics) {
		const severity = editorSeverity(found.severity, info);
		if (severity === undefined) continue;
		const range = editorRange(
			found,
			document.lineCount,
			(line) => document.lineAt(line).text.length,
		);
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(
				range.startLine,
				range.startCharacter,
				range.endLine,
				range.endCharacter,
			),
			found.message,
			severity,
		);
		diagnostic.source = "mdq";
		diagnostic.code = { value: found.code, target: LINT_CODES_URL };
		result.push(diagnostic);
	}
	return result;
}

function editorSeverity(
	severity: MdqDiagnostic["severity"],
	info: InfoDisplay,
): vscode.DiagnosticSeverity | undefined {
	switch (severity) {
		case "error":
			return vscode.DiagnosticSeverity.Error;
		case "warning":
			return vscode.DiagnosticSeverity.Warning;
		case "info":
			if (info === "off") return undefined;
			return info === "hint"
				? vscode.DiagnosticSeverity.Hint
				: vscode.DiagnosticSeverity.Information;
	}
}
