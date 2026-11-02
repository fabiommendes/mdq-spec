import { render } from "solid-js/web";
import "../../css/plain.css";
import "./playground.css";
import { App } from "./App.jsx";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root");
render(() => <App />, root);
