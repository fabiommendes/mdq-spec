---
type: issue
status: todo
tags: [mdq-js, banks, async, include]
relatedTo: [mdq-js/docs/handoffs/10-banks.md]
---

# Async question banks in mdq-js

F4.2 (`mdq-js/docs/handoffs/10-banks.md`) ports the question bank as a
synchronous, in-memory API: `QuestionBank` (`load`, `tagged`, `ids`),
`DictLoader` and `resolveExam(exam, bank)`. A host with a remote bank must
fetch every question first.

The common web use case is a bank in a database or behind an HTTP API. It
needs an async bank:

* An async `QuestionBank` interface (`load`, `tagged`, `ids` return
  promises), and an async `resolveExam`.
* Fetch only what the exam needs: `include` loads one id, `include-all`
  loads the ids of a tag query. Avoid loading the whole bank.
* Decide whether the sync API stays, and how the two share the resolution
  rules without duplicating them (for example, a resolver written once over
  an async interface, with a sync adapter).
* Batching: a resolver that asks for many ids should be able to ask for them
  in one call.

Start after F4.2 lands. Python has no async bank; decide with the human
whether the spec or mdq-py needs anything.
