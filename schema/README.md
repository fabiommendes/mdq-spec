# @mdq-format/schema

The JSON Schema of [MDQ](https://github.com/fabiommendes/mdq-spec), a Markdown
format for questions and exams. The package version is the version of the MDQ
specification.

- `mdq.schema.json`: one bundle that validates any MDQ question or exam in
  YAML or JSON.
- `<type>.yaml`: the schema of each question type, of the exam and of the
  runner report.

Use the bundle from a YAML or JSON document:

```yaml
$schema: https://cdn.jsdelivr.net/npm/@mdq-format/schema@0.2/mdq.schema.json
type: multiple-choice
```

The `$id` of each schema contains the major and minor version (`@0.1`). Before
version 1.0.0, a new minor version can have incompatible changes, so it gets
new `$id`s.
