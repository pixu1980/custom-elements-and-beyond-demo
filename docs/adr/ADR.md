# Architecture Decision Records

Every decision this project has taken, newest first. The numbered files in
this directory are the source of truth; this index is generated from them by
`pix_tool_process_adr`, so editing it by hand is work the next call throws away.

## Index

| #                                                                        | Title                                                      | Date       | Status   | Tags                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------- | -------- | --------------------------------- |
| [001](001-mirror-the-reference-release-pipeline-for-pages-deployment.md) | Mirror the reference release pipeline for Pages deployment | 2026-10-07 | accepted | ci, release, parcel, github-pages |

## What each decision says

The opening sentence of each decision and of what it cost, lifted from the
file. Where a line stops short the rest is in the ADR.

| ADR                                                                      | Decision                                                                                                                                                                                                                        | Consequence                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [001](001-mirror-the-reference-release-pipeline-for-pages-deployment.md) | Reuse the reference pipeline verbatim: the same deploy workflow that runs on version tags through the official Pages actions, the same package script set (dependency bump, cache clear, parcel build, brotli build, release... | The release flow is identical across both demo projects and is documented once. |

## By theme

Tags carried by 3 or more decisions. A decision appears under every
theme it carries, and the early ADRs that predate the tag field are listed last.

## Operating rules

- Record a structural decision with `pix_tool_process_adr`, when it is taken.
- Never rewrite an accepted decision. Supersede it with a new one that says why.
- Never edit this file. Edit the ADR and let the next call regenerate it.
