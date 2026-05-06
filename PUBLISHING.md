# Publishing a sensor

End-to-end checklist for shipping a new version of any sensor in this repo to npm.
Assumes you're publishing under `@kafkacat` and your npm account has **WebAuthn-only 2FA** (Touch ID via passkey, no TOTP).

## TL;DR

```
bump version  →  build + test  →  script-wrapped npm publish  →  open auth URL in browser  →  Touch ID  →  validate  →  tag + push
```

---

## 1. Bump version

`version` string is currently hard-coded in **4 places** — bump them together or `defineSensor`'s reported version drifts from `package.json`.

```bash
cd <sensor-subdir>           # e.g. gh-trending/

# 1.1 — let npm bump package.json + create a vX.Y.Z tag
npm version patch            # 0.1.0 → 0.1.1   (use `minor` / `major` as needed)

# 1.2 — sync the other 3 places. Quick grep to find them:
grep -rn '"0\.1\.0"' src/    # before npm version
# the 3 to update each release:
#   src/index.ts        defineSensor({ version: "0.1.1" })
#   src/transform.ts    SENSOR_META.version: "0.1.1"
#   src/fetch-trending.ts  user-agent string ".../0.1.1; +https://..."
```

> If it ever bites you twice in a row, refactor to read `version` from `package.json` once at runtime — that's the proper fix. ~10 min of work.

## 2. Build, test, dry-run

```bash
npm run build && npm test
npm pack --dry-run | tail -10        # check tarball: name, version, files
```

Verify the dry-run shows only `dist/{js,d.ts}`, `LICENSE`, `README.md`, `SETUP.md`, `package.json`. **Test files and `smoke.*` must NOT be in the tarball.**

If npm prints `"bin[X]" script name dist/Y.js was invalid and removed` — run `npm pkg fix` to silence; it's npm normalising paths (`./dist/bin.js` → `dist/bin.js`).

## 3. Publish — Touch ID web flow

`npm publish --otp=...` is **not an option** for WebAuthn-only 2FA. Every publish needs a fresh Touch ID. npm masks the auth URL in stderr when not on a TTY, so wrap with `script` to capture it.

```bash
# 3.1 — kick off publish in background under a TTY emulator
rm -f /tmp/npm-pub.log
script -q /tmp/npm-pub.log npm publish --access public </dev/null > /dev/null 2>&1 &

# 3.2 — wait for prepublishOnly (clean + build) to finish, then extract the URL
sleep 12
grep -aoE "https://www.npmjs.com/auth/cli/[0-9a-f-]+" /tmp/npm-pub.log

# 3.3 — open that URL in browser, complete Touch ID
#       npm CLI receives the auth and continues automatically

# 3.4 — confirm CLI finished (look for the "+ @kafkacat/..." success line)
tail -c 400 /tmp/npm-pub.log | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | tail -5
rm -f /tmp/npm-pub.log
```

`npm unpublish` follows the exact same flow (replace step 3.1 command). **Unpublish is only allowed within 72 hours** of publish, with no other packages depending on yours.

## 4. Validate

```bash
# 4.1 — registry sees the new version (CDN may take 5-30s; poll if 404)
until curl -sf "https://registry.npmjs.org/@kafkacat/<package>" >/dev/null; do sleep 5; done
npm view @kafkacat/<package> version dist.tarball

# 4.2 — install in a scratch dir and run the bin briefly (e2e against real source)
mkdir -p /tmp/postpub && cd /tmp/postpub && npm init -y >/dev/null
npm install @kafkacat/<package>
ls node_modules/.bin/<bin-name>                                # must exist
ls node_modules/@kafkacat/<package>/SETUP.md                   # must exist
W2A_CADENCE=weekly W2A_TOP_N=3 npx <bin-name> &
PID=$!; sleep 6; kill -TERM $PID 2>/dev/null
```

If the bin is missing from `node_modules/.bin/` — your `package.json` `bin` key was probably stripped by npm. Run `npm pkg fix` and republish.

## 5. Tag + push

`npm version` already created a local `vX.Y.Z` tag. Push it:

```bash
cd /Users/machinepulse29/workspace4/w2a-sensors    # parent repo
git add -A && git commit -m "chore(<sensor>): release vX.Y.Z"
git push origin main --tags
```

If you renamed something and want to **move** an existing tag (e.g. you republished after renaming a package within the 72h window):

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag -a vX.Y.Z -m "..."
git push --tags
```

---

## Caveats / lessons learned

### 2FA mode

- Account 2FA is **WebAuthn-only** (Touch ID passkey). `npm publish --otp=123456` cannot work — there's no TOTP secret to derive a 6-digit code from.
- npm sometimes serves the wrong stale state (`npm profile get` showed `auth-and-writes` after a partial disable that didn't complete). If publishes start failing E403 unexpectedly, re-check 2FA via web UI.
- If you ever want CLI to run unattended (CI), generate a **granular access token** at https://www.npmjs.com/settings/kafkacat/tokens with **"Allow this token to bypass 2FA when publishing"** explicitly checked. Token must be scoped to `@kafkacat` and revoked after the run. **Never commit it.** Write to `/tmp/npmrc-publish` with `chmod 600`, pass via `--userconfig=`, `rm` after publish.
- Adding a TOTP authenticator app as a *second* 2FA method (alongside the passkey) makes future CLI publishes trivial: `npm publish --otp=123456`. Worth doing if Touch-ID-via-browser annoys you. Settings page → Two-Factor Auth.

### npm CLI quirks

- **stderr URL masking**: when `npm` writes to a non-TTY stderr, the WebAuthn auth URL is replaced with `***`. Always wrap publish/unpublish in `script -q file cmd` to capture it. The "real" URL is in the typescript file `script` produces.
- **`./` in `bin` paths**: npm normalises `"./dist/bin.js"` to `"dist/bin.js"` and warns "was invalid and removed". Use `npm pkg fix` (already run; this won't hit you again unless you re-introduce the `./`).
- **publish CDN propagation**: 5-30 seconds typical. `npm view` may return 404 right after a successful `npm publish`. Don't panic; poll the registry directly with `curl -sIL https://registry.npmjs.org/@kafkacat/<package>`.

### Renames

- Rename within the **first 72 hours** of publish: `npm unpublish --force` the old name, change all 5+ identifiers (package name, bin, dir, src/index.ts id, src/transform.ts SENSOR_META.id, src/fetch-trending.ts user-agent, SETUP.md handler-skill name `packageToSkillId(...)`, README install commands, parent README table), republish under the new name. The unpublished name is squat-blocked for 24h afterwards.
- After 72h: republish under new name + `npm deprecate` the old one with a "Renamed to ..." message. Old name lives forever in the registry — npm policy.

### Files inside the tarball

`package.json` `files` is intentionally narrow:

```
"files": [
  "dist/**/*.js",
  "dist/**/*.d.ts",
  "!dist/test/**",
  "!dist/smoke.*",
  "SETUP.md",
  "README.md"
],
```

`!dist/test/**` and `!dist/smoke.*` are negative globs — they exclude compiled test files and the smoke harness from the tarball. Verify after `npm pack --dry-run`.

---

## Adding a new sensor

1. Read https://github.com/machinepulse-ai/world2agent/blob/main/skills/build-w2a-sensor/SKILL.md (or install the skill: `npx skills add https://github.com/machinepulse-ai/world2agent/skills/build-w2a-sensor`).
2. Create `<source-name>/` at repo root (e.g. `hackernews/`, `reddit/`). Mirror `gh-trending/` structure.
3. Package name: `@kafkacat/w2a-<source-name>` (drop `sensor-` per convention here — the `w2a-` prefix carries the marker).
4. Bin: same as package basename.
5. After implementing, follow this PUBLISHING.md from §1.
6. Update repo `README.md` Sensors table.
