# 001: Mirror the reference release pipeline for Pages deployment

- **Date**: 2026-10-07
- **Status**: accepted
- **Tags**: ci, release, parcel, github-pages
- **Author**: Emiliano Pisu <emiliano.pisu@webidoo.com>

## Context

This standalone demo is a port of the reference reactive demo project and must ship the same release flow: tag driven GitHub Pages deployment of the Parcel build output, with Brotli sidecar assets generated at build time.

## Decision

Reuse the reference pipeline verbatim: the same deploy workflow that runs on version tags through the official Pages actions, the same package script set (dependency bump, cache clear, parcel build, brotli build, release variants), and the same Brotli sidecar generator script under the scripts directory. The swc core package is pinned to the same version as the reference project so both Parcel toolchains stay aligned.

## Consequences

The release flow is identical across both demo projects and is documented once. The build script performs staged commit amend and forced push, so it must run on the release commit with the origin remote configured. The pre-existing formatter warning on the lock file is inherited from the reference project.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Write a bespoke workflow with separate lint and build jobs and no Brotli step
1. Publish the package to a registry with provenance instead of deploying to Pages
1. Rely on the provider default static build and stop committing the output directory
