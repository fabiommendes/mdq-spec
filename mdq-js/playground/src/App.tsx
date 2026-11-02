import { createSignal, For, type JSX, onCleanup, Show } from "solid-js";
import { findFixture, fixtures, groups } from "./fixtures.js";
import { Workbench } from "./Workbench.jsx";

/** The fixture id in `#/<group>/<name>`. */
function currentId(): string {
	return decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
}

export function App(): JSX.Element {
	const [id, setId] = createSignal(currentId() || (fixtures[0]?.id ?? ""));
	const onHash = () => setId(currentId());
	window.addEventListener("hashchange", onHash);
	onCleanup(() => window.removeEventListener("hashchange", onHash));

	const fixture = () => findFixture(id());

	return (
		<div class="app">
			<nav class="sidebar">
				<For each={[...groups()]}>
					{([group, items]) => (
						<details open={group === fixture()?.group}>
							<summary>{group}</summary>
							<ul>
								<For each={items}>
									{(item) => (
										<li>
											<a
												href={`#/${item.id}`}
												aria-current={item.id === id() ? "page" : undefined}
											>
												{item.name}
											</a>
										</li>
									)}
								</For>
							</ul>
						</details>
					)}
				</For>
			</nav>
			<main>
				<Show
					when={fixture()}
					keyed
					fallback={<p class="note">No fixture "{id()}".</p>}
				>
					{(item) => (
						<>
							<h1>{item.id}</h1>
							<Workbench source={item.source} />
						</>
					)}
				</Show>
			</main>
		</div>
	);
}
