# w2a-sensors

[World2Agent](https://github.com/machinepulse-ai/world2agent) sensors I publish under [`@kafkacat`](https://www.npmjs.com/~kafkacat).

Each subdirectory is an independent npm package — its own `package.json`, its own release cadence, no shared build, no workspaces.

## Sensors

| Package | Source | Signals | Status |
| :-- | :-- | :-- | :-- |
| [`@kafkacat/w2a-gh-trending`](./gh-trending) | [github.com/trending](https://github.com/trending) digest, daily or weekly | `repo.trending.refreshed` | `0.1.0` |

## Use a sensor

Inside **Claude Code**:

```
/world2agent:sensor-add @kafkacat/w2a-gh-trending
```

Outside Claude Code:

```bash
npm install -g @kafkacat/w2a-gh-trending
w2a-gh-trending
```

Each sensor's `README.md` and `SETUP.md` cover its specific configuration.

## License

MIT — see each subpackage's `LICENSE`.
