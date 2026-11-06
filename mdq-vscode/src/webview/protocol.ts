/**
 * The messages between the extension and the preview webview.
 *
 * The webview loads the document itself, with the mdq-js bundled in it: the
 * extension only sends the text. A response the student gives in the
 * webview then never crosses back.
 */

import type { Format } from "mdq";
import type { Locale } from "mdq/solid";

/** Extension to webview: the document to show. */
export interface ShowMessage {
	readonly type: "show";
	readonly text: string;
	readonly format: Format;
	/** The file name, for the title of the preview. */
	readonly name: string;
	readonly locale: Locale;
}

/** Webview to extension: the webview is ready to receive a `show`. */
export interface ReadyMessage {
	readonly type: "ready";
}

/** The webview locale for a VS Code display language, such as `pt-br`. */
export function localeOf(language: string): Locale {
	return language.toLowerCase() === "pt-br" ? "pt-BR" : "en";
}
