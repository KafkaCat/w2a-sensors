# GitHub Trending Sensor Setup

Scrapes https://github.com/trending on a daily or weekly cadence and emits one digest signal per cycle (`repo.trending.refreshed`) carrying the top N repos with their star deltas, languages, and descriptions. No GitHub authentication required — the trending page is public.

Pre-filtering is quantitative only (cadence, top N, optional cross-cycle dedupe). Topic / language relevance is the handler skill's job.

## Configuration Parameters (written to `~/.world2agent/config.json`)

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `cadence` | `"daily" \| "weekly"` | No | `"weekly"` | How often to fetch and emit, and which `since=` window to scrape. |
| `top_n` | integer (1–25) | No | `10` | How many repos to include in each digest. |
| `dedupe_within_cycles` | integer (0–52) | No | `0` | If > 0, repos seen in any of the last N digests are skipped. `0` = always send (recommended). |

## Questions to Ask

### 1. Config questions (populate the sensor config)

Ask in one prompt, all defaulted:

> "GitHub Trending digest — three optional settings:
>
> 1. Cadence: daily or weekly? (default: weekly)
> 2. How many top repos per digest? (default: 10, max 25)
> 3. Skip repos that already appeared in the last N digests? Enter a number, or 0 to always send. (default: 0)
>
> Press Enter at any prompt to keep the default."

### 2. Semantic preferences (populate the handler skill)

> "When a new GitHub Trending digest arrives:
>
> 1. What topics or languages do you most care about? (e.g. AI/LLM, TypeScript, Rust, devtools, security) — used to highlight relevant repos.
> 2. For repos you care about: just summarise, open the repo URL, draft a quick PR/issue comment, or save to a reading list?
> 3. Anything to ignore? (e.g. crypto, LeetCode solutions, sketchy starred-by-bot repos)"

## Output

### 1. Write `~/.world2agent/config.json`

```json
{
  "sensors": [
    {
      "package": "@kafkacat/sensor-github-trending",
      "config": {
        "cadence": "weekly",
        "top_n": 10,
        "dedupe_within_cycles": 0
      },
      "skills": ["<absolute path to the handler skill's directory from §2>"]
    }
  ]
}
```

### 2. Write the handler skill

Skill filename and frontmatter `name:` MUST be `kafkacat-sensor-github-trending` (= `packageToSkillId("@kafkacat/sensor-github-trending")`).

Template:

```markdown
---
name: kafkacat-sensor-github-trending
user-invocable: false
description: Handle GitHub Trending digest signals (repo.trending.refreshed). User cares about [USER_TOPICS].
---

# GitHub Trending Signal Handler

## User Preferences
- Topics of interest: [USER_TOPICS]
- Action style for relevant repos: [USER_ACTION]
- Ignore: [USER_SKIP_POLICY]

## Signal Shape
- `event.type`: `repo.trending.refreshed`
- `event.summary`: multi-line, emoji-rich. Header line + per-repo line (rank emoji, name link, language, ⭐ delta, heat badge) + one-line blurb under each. An agent reading only the summary can already triage; deeper reasoning lives in `attachments[0]`.
- `source_event.data`: `{ window, captured_at, source_url, repo_count, repos[] }`. Each repo entry carries `{ rank, full_name, url, description, language, stars_total, stars_gained_in_window, forks }`.
- `attachments[0]` (inline `text/markdown`): rich digest — per-repo section with description quote, "Why it's hot" reasoning (derived from star ratios), "Use it for" category hint, and the canonical URL. Read this when the user wants details on a specific repo.
- `attachments[1]` (reference `text/html`): live github.com/trending URL. Fetch only if the inline digest is stale or insufficient.

## Priority & Handling
- Default urgency: informational.
- For each repo in `source_event.data.repos`:
  - If it matches `[USER_TOPICS]`, surface it per `[USER_ACTION]`.
  - If it matches `[USER_SKIP_POLICY]`, drop silently.
  - Otherwise: include in a one-line tail summary so the user can scan the rest.
- Never paginate or fetch GitHub repo metadata unless the user explicitly asks — `source_event.data` already has what's needed for triage.
```

## Before writing

1. Show the proposed `config.json` and handler skill to the user for confirmation.
2. Resolve the handler-skill directory (runtime-dependent — consult the agent's skills discovery rules).
3. Write the handler skill, record its directory's absolute path, and write that path into the `skills` array of `config.json`.
