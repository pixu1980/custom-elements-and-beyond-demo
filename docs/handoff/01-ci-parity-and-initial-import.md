# Session Handoff 01 — CI Parity and Initial Import

- **Branch**: `main`
- **Commit range**: repository root to `HEAD` — three commits, from
  `feat(project): initial import of the custom elements demo` through
  `chore(handoff): add session handoff 01-ci-parity-and-initial-import`.
  `main` had no history before the first commit.
- **Date**: 2026-10-07

> **Hash warning.** A `tokensave serve` daemon running against this project
> rewrites local history (empty-root rebase, then `amend`) whenever it re-indexes
> the tree. Short hashes recorded in this document were observed at write time
> and may already be stale. Identify commits by their subject, or re-read them
> with `git log`; never hard-code these hashes in scripts.

## Scope of this session

1. Align the project with the CI and release pipeline of the reference project
   `~/Projects/talks/reactive-apps-without-frameworks-demo`.
2. Set the repository origin.
3. Import the whole project as its first commits and archive this handoff.

## What was done

### CI parity

- `.github/workflows/static.yml` was already byte-identical to the reference
  (`sha1 0b9dfca2856c79c84675d4f0f34caf9c79697e73`). It deploys `./dist` to GitHub
  Pages on tags matching `v*.*.*` using `actions/checkout@v6`,
  `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` and
  `actions/deploy-pages@v5`, with `group: pages` concurrency and
  `cancel-in-progress: false`.
- `scripts/compress-brotli.mjs` was copied verbatim from the reference
  (`sha1 62dd1027557811fd8789e3c5799e7215111361d3`). It walks `dist`, compresses
  the compressible extensions at Brotli quality 11 and writes `.br` sidecars,
  skipping files that do not shrink.
- `package.json` scripts now mirror the reference set:
  `deps`, `deps:push`, `clear:cache`, `clear:dist`, `clear`, `predev`, `dev`,
  `prebuild`, `build:parcel`, `build:brotli`, `build`, `rel:push`,
  `rel:major`, `rel:minor`, `rel:patch`.
- `@swc/core@1.16.13` was added to `devDependencies` to pin the same Parcel
  toolchain as the reference. It was already allowed in `pnpm-workspace.yaml`
  and the lockfile was refreshed with `pnpm install`.
- `package.json` now differs from the reference only by `name`, `version`
  (`0.1.0` vs `0.5.0`) and the extra `playwright` dev dependency.

### Origin

`origin` = `git@github.com:pixu1980/custom-elements-and-beyond-demo.git`
(fetch and push). Nothing has been pushed yet.

### Commits created

- `feat(project): initial import of the custom elements demo` —
  146 files, the entire source tree, tooling, `dist` with Brotli sidecars and
  the deploy workflow.
- `docs(adr): add ADR log and implementation journey` —
  `docs/adr/001-...`, `docs/adr/ADR.md`, `docs/implementation-journey.md`.
- `chore(handoff): add session handoff 01-ci-parity-and-initial-import` —
  this document, alone.

An external `tokensave serve` process amended the docs commit twice and folded
this handoff file into it. The history was rebuilt from the initial-import commit
to keep the split clean; the handoff commit was verified to contain only this
file.

The split was chosen by the user after the ambiguity check: one initial import
commit plus one separate docs commit, instead of a finer-grained sequence.

## Verification performed

- `pnpm run clear:dist && pnpm run build:parcel && pnpm run build:brotli` →
  production build plus 4 Brotli sidecars, `dist` holds 8 files.
- `pnpm run lint:biome` → 0 errors, 4 pre-existing warnings.
- `pnpm run lint:prettier` → fails on `pnpm-lock.yaml` only. The same failure
  reproduces in the reference project, so it is inherited, not introduced here.
- `pix_tool_check` `mode=project` → no guardrail violations (graph checks were
  skipped as unavailable).
- The dev server was stopped before the final build so Parcel would not repopulate
  `dist` with development artifacts (source maps).

## Known constraints

- `pnpm run build` runs `git add . && git commit --amend --no-edit && git push -f`,
  so it must be invoked on the release commit with an upstream configured.
- `dist` is tracked on purpose, matching the reference project.
- `pnpm dev` runs `predev` → `clear`, which deletes the tracked `dist`, and the
  Parcel dev server then writes development artifacts (source maps) there. Running
  the dev server therefore always dirties `dist`. During this handoff the server was
  started as `pnpm exec parcel src/index.html -p 6002 --dist-dir .parcel-cache/dev`
  to keep the working tree clean, since `.parcel-cache` is gitignored.
- ADR 001 records the decision to mirror the reference pipeline.

## Next steps

1. Review the three local commits and the ADR.
2. Push `main` and set the upstream.
3. Run a release (`rel:patch`) to exercise the full pipeline and confirm the
   Pages deployment triggered by the version tag.

### Resume Prompt

```prompt
Resume work on custom-elements-and-beyond-demo from docs/handoff/01-ci-parity-and-initial-import.md.
Run `pix_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.

First step: push the three local commits to origin git@github.com:pixu1980/custom-elements-and-beyond-demo.git
(`git push -u origin main`). Nothing is pushed yet.
Then verify the release flow end to end with `pnpm run rel:patch`, which rebuilds, generates Brotli
sidecars, bumps the version, tags `v0.1.1` and pushes the tag that triggers the Pages deployment.
```
