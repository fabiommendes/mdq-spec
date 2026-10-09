---
name: audit-spec
description: Audit of the MDQ specification, or of how an implementation (Python, JavaScript) complies with it, delivered as a PDF/HTML report with ready-to-paste GitHub issues. Use when the user asks to audit the MDQ spec or check an implementation against it.
disable-model-invocation: true
argument-hint: "[spec, py, js]"
---

# Audit mdq spec

Audit the MDQ specifications or compliance of implementations and deliver a
report defined by the `audit-report` skill.

The process is designed around the following constraints:

- The audit process must be thorough and must identify all issues with the specification.
- The audit is resource-intensive, so we must plan and try to preserve context.
- The output should be actionable and provide concrete decision points to the human.


## Scope

User can limit the scope of an audit in the skill argument. The argument should
at minimum specify which part of the system is being audited: spec, python or
javascript implementations. It can also provide additional constraints (e.g.,
focus on a specific question type).

Each part (spec, py, js) defines instructions in a separate document. Read
only the relevant document for the part being audited.

- spec: Audit the specification itself for completeness, correctness, and
  consistency. More info at [spec.md](spec.md).
- py: Audit the Python implementation for adherence to the specification. More info at [py.md](py.md).
- js: Audit the JavaScript implementation for adherence to the specification. More info at [js.md](js.md).
