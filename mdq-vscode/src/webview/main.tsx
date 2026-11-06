/**
 * Entry point of the preview webview. It receives the document from the
 * extension (`ShowMessage`) and keeps the last one and the mode in the
 * webview state, so a hidden panel shows the same thing when it comes back.
 */

import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Preview, type PreviewMode } from "./Preview.jsx";
import type { ReadyMessage, ShowMessage } from "./protocol.js";

interface State {
	shown?: ShowMessage;
	mode?: PreviewMode;
}

declare function acquireVsCodeApi(): {
	postMessage(message: ReadyMessage): void;
	getState(): State | undefined;
	setState(state: State): void;
};

const vscode = acquireVsCodeApi();
const saved = vscode.getState() ?? {};
const [shown, setShown] = createSignal(saved.shown);
const [mode, setMode] = createSignal<PreviewMode>(saved.mode ?? "answer");

const save = () => vscode.setState({ shown: shown(), mode: mode() });

window.addEventListener("message", (event: MessageEvent<ShowMessage>) => {
	if (event.data.type !== "show") return;
	setShown(event.data);
	save();
});

const root = document.getElementById("root");
if (root === null) throw new Error("the preview page has no #root");
render(
	() => (
		<Preview
			shown={shown()}
			mode={mode()}
			onMode={(next) => {
				setMode(next);
				save();
			}}
		/>
	),
	root,
);
vscode.postMessage({ type: "ready" });
