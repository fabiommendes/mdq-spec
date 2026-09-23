/**
 * The MDQ document schemas.
 *
 * Zod serves as both the type definitions and the runtime validators here --
 * where the Python implementation keeps `mdq.types` (TypedDicts) and
 * `mdq.models` (Pydantic) side by side and syncs them by hand, one Zod schema
 * gives us both. See `docs/sync/schemas.md`.
 *
 * The schemas mirror `schema/*.yaml` at the repository root, which stays the
 * authoritative definition for both implementations.
 */

export * from "./common.js";
export * from "./exam.js";
export * from "./questions.js";
