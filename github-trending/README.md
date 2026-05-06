# @kafkacat/sensor-github-trending

A [World2Agent](https://github.com/machinepulse-ai/world2agent) sensor that scrapes [github.com/trending](https://github.com/trending) on a daily or weekly cadence and emits one digest signal per cycle.

Each `repo.trending.refreshed` signal carries:

- A multi-line, emoji-rich `event.summary` with per-repo links and heat badges (an agent can triage from this alone).
- A structured `source_event.data.repos[]` — rank, full_name, url, description, language, stars total / stars gained in window, forks.
- An inline markdown digest in `attachments[0]` with a "Why it's hot" / "Use it for" line per repo (derived from star ratios — no extra network calls, no LLM).
- A reference link to the live trending page in `attachments[1]`.

No GitHub authentication required — the trending page is public.

## Install

```bash
npm install -g @kafkacat/sensor-github-trending
```

> Inside **Claude Code**, prefer `/world2agent:sensor-add @kafkacat/sensor-github-trending` — the plugin walks the `SETUP.md` Q&A and wires up the handler skill for you.

## Signals emitted

- `repo.trending.refreshed`

## Run

```bash
w2a-sensor-github-trending
```

Or with explicit configuration via env vars:

```bash
W2A_CADENCE=daily W2A_TOP_N=5 w2a-sensor-github-trending
```

See [`SETUP.md`](./SETUP.md) for the full configuration table and handler-skill template.

## License

MIT
