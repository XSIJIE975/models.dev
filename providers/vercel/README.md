Vercel AI Gateway Models

Generate model TOMLs from Vercel AI Gateway API.

Prerequisites
- Node.js 22+ and pnpm

Commands
- Generate files: `pnpm vercel:generate`
- Dry run: `pnpm vercel:generate --dry-run`
- New only: `pnpm vercel:generate --new-only`
- Validate: `pnpm validate`

Details
- Source endpoint: `https://ai-gateway.vercel.sh/v1/models`
- Output path: `providers/vercel/models/<model-id>.toml` (nested folders for IDs with `/`)

Notes
- The generator merges with existing files rather than replacing them
- Orphaned files (not in API) are warned about but not deleted
- Use `--dry-run` to preview changes before writing
- Use `--new-only` to skip updating existing model files
