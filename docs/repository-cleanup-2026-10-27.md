# Repository cleanup — 2026-10-27

Base: `65ad676446e612090ca78c773814eb9b48e3e59a` (`main`).

## Changes

- Remove 5,404 tracked dependency files (272.5 MiB uncompressed) and generated React/CSS/pricing output. Git history remains intact.
- Materialize the previous build-time gateway, webhook, tracker, intro and favicon patches into source; remove six one-off patch scripts. This preserves what the old deployment build produced.
- Extract homepage interactions, intro, tracker loading and CSS unchanged. Split the admin script into 16 ordered sources, concatenated into a single classic script to preserve hoisting and shared state.
- Build pricing with the main site; publish an explicit `dist/` output without repository documentation, configuration or source files.
- Remove obsolete legacy HTML and two unused globe JPGs; retain the active HQ texture. Redirect legacy page URLs.
- Move deployment CLIs to devDependencies, remove the unused direct form-data dependency, and synchronize the lockfile metadata.
- Replace outdated setup/deployment documentation and add a read-only GitHub Quality workflow.

## Verification

- Fresh `npm ci` (including pricing install hook) succeeded.
- `npm run quality`: 43 tests, root TypeScript, JS syntax checks and complete build passed.
- A second full build produced 101 byte-identical output files and left 220 source files unchanged.
- Before/after extraction: inline JavaScript and CSS bodies matched byte-for-byte before trailing whitespace and extra blank lines were normalized for the final commit.
- Isolated Chromium checks at 1440px and 390px: homepage and archive section/footer dimensions match; no page errors, missing local assets or horizontal overflow. External services were blocked for these comparisons, and intro session state was set to seen.
- Live Firebase writes, Telegram, email delivery and authenticated admin/PDF flows were not exercised. Existing behavioral tests cover their local logic.
- Local Chromium unpacking required a host-only workaround and `SOCIAL_PREVIEW_CHROMIUM_PATH=/tmp/chromium` on the first complete run. The subsequent normal build passed. No machine-specific path is committed.
- Existing Browserslist-age and pricing chunk-size warnings remain; no dependency major upgrades were attempted.

## Branch housekeeping

The following task tips are all ancestors of the reviewed `main` commit. Their SHAs are recorded for restoration. Unmerged branches, open PRs, backup branches and `v1`/`v2` are retained.

| Branch | Tip SHA |
| --- | --- |
| `agent/intro-loading-poster` | `b3367654cb196f2291f06347014fb9fca69f50ef` |
| `agent/malta-hero-preview` | `dd4db549a5d30ca7bde7e8f5c098974417e468a5` |
| `agent/mobile-preview-fit` | `43980daa5cfdeb53f77a8f587d08cee5aed334a8` |
| `agent/mobile-signal-type-parity` | `c720608c31e0ea629b550fee80b6222e6c9d0909` |
| `agent/project-preview-cookie-parity` | `71856f9d1b2547fe38099572da1389ec5cc393b9` |
| `codex/admin-auth-hardening-20260412` | `5d380a3a1be1654e530fd25c2c760447dad8d67f` |
| `codex/fix-tracker-command-listener-rules-20260425` | `a8e03bde2e06e66c9766d7f2da135e2076b1d3da` |
| `codex/gemini-command-hardening-20260425` | `2099b7f6842881f6ca460741cadd20b413be4d36` |
| `favicon-unified-20260731` | `56d6df1348b524393ae70f04a0de25f4cfffd00c` |
| `feat/startpage-agent-auth` | `8527996aeb3d72fdbb43dd798e0b7dbce8b38d85` |
| `feature/home-selected-work-refresh` | `bd3e9da2139f9d6ffa8165c553a2f0dc86c43ea0` |
| `fix-canonical-home` | `bfd6b6caa1c426aedfcea98ca9ae6c1b090607bd` |
| `fix-intro-session-guard` | `fc3077265d99297b17ca8fa17695ea3d83ccb671` |
| `intro-gold-balance-v4` | `b5fdf5243c39cd6f70e25b143fb2fa7027f40600` |
| `intro-hq-v3` | `3d71e43123183276d923c61c05b97f37fa89629d` |
| `intro-texture-only-v5` | `ac36ab60dfd0e5b5ba5cab36777a3c1d61218970` |
