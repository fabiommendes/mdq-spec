# Changelog

All notable changes to the MDQ extension are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Diagnostics of `*.mdq.md`, `*.mdq.yaml`, `*.mdq.yml` and `*.mdq.json` files, from mdq-js, updated as you type.
- The MDQ JSON Schema registered for `*.mdq.json` and `*.mdq.yaml`, for completion and hover.
- Setting `mdq.diagnostics.info`: show `info` diagnostics as information, as hints or not at all.
- Preview of a question in the student view and in the answer key view: commands `MDQ: Open Preview` and `MDQ: Open Preview to the Side`.
- `*.mdq` files, and an MDQ language: any file in it is read as MDQ Markdown. Pick it with "Change Language Mode" or with `files.associations`.
