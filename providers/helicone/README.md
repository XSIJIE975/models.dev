Helicone Models

Generate model TOMLs from Helicone’s public registry.

Prerequisites
- Node.js 22+ and pnpm

Commands
- Generate files: `pnpm helicone:generate`
- Validate configs: `pnpm validate`

Details
- Source endpoint: `https://jawn.helicone.ai/v1/public/model-registry/models`
- Output path: `providers/helicone/models/<model-id>.toml` (flat, no provider folders)
- Dates: `release_date`/`last_updated` use `YYYY-MM-DD`; `knowledge` uses `YYYY-MM`.
- Pricing: writes `cost.reasoning` only when `reasoning = true`.
- Modalities: sanitized to `["text", "audio", "image", "video", "pdf"]`.

Notes
- The generator cleans the output folder before writing: removes any nested provider folders and existing TOML files to keep Model IDs flat (e.g., `claude-3.5-haiku`).
