# w2a-sensors

Personal [World2Agent](https://github.com/machinepulse-ai/world2agent) sensors published under `@kafkacat`. Each subdirectory is one independent npm package — its own `package.json`, its own release cadence, no shared build, no workspaces. Mirrors the upstream `world2agent-sensors` flat-monorepo layout.

## Conventions

- **Package name**: `@kafkacat/w2a-<source-name>` (e.g. `@kafkacat/w2a-gh-trending`).
- **Bin command**: same as package basename (`w2a-gh-trending`).
- **Subdirectory**: source-name only, no prefix (`gh-trending/`).
- **Handler skill name**: `kafkacat-w2a-<source-name>` (= `packageToSkillId(<package-name>)` per W2A spec).
- **License**: MIT, one `LICENSE` per subpackage.
- **Package manager**: npm (not pnpm — no preference, just consistent).

## Publishing

See [PUBLISHING.md](./PUBLISHING.md) for the full release flow including the **Touch ID web auth** dance (this account uses WebAuthn-only 2FA — `--otp=…` won't work, every publish needs a browser interaction). Don't shortcut around the `script`-wrapped publish trick — npm masks the auth URL on non-TTY stderr.

## Building a new sensor

The official guide is the W2A `build-w2a-sensor` skill — `Skill: build-w2a-sensor` if installed, or read it at https://github.com/machinepulse-ai/world2agent/blob/main/skills/build-w2a-sensor/SKILL.md. Phase 1-4 (discovery → signal design → scaffold → SETUP.md) are non-skippable; Phase 5-6 (test + publish) for this repo are codified in `PUBLISHING.md`.

## Reference

- W2A protocol & schema: https://github.com/machinepulse-ai/world2agent
- SDK: `@world2agent/sdk` (`/sensor`, `/consumer`, `/testing` subpaths)
- Official sensors (for reference patterns): https://github.com/machinepulse-ai/world2agent-sensors
