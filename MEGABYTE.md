# megabyte

megabyte is a fork of [pi](https://github.com/earendil-works/pi) (earendil-works,
MIT), used as the agent engine. We keep pi's internals untouched so we can pull
upstream updates, and layer megabyte on top:

- `bin/megabyte` — launcher. Points the agent directory at `~/.megabyte/agent`
  (via `PI_CODING_AGENT_DIR`), seeds megabyte's config/extensions on first run,
  and runs the pi bundle. Symlinked to `~/.local/bin/megabyte`.
- `megabyte/agent/` — megabyte's config template:
  - `models.json` — local Ollama provider (qwen-es, qwen3-abliterated).
  - `APPEND_SYSTEM.md` — megabyte identity + tool-use policy.
  - `extensions/` — ported tools:
    - `ask-claude.ts` — escalate to the Claude CLI when stuck.
    - `web-search.ts` — DuckDuckGo search (no API key), with a lite fallback.

## Build (once)

```bash
npm install --ignore-scripts
npm rebuild esbuild
npm run build          # generates model data + bundles the CLI
ln -sf "$PWD/bin/megabyte" ~/.local/bin/megabyte
```

## Use

```bash
megabyte                                   # interactive
megabyte --provider ollama --model qwen-es -p "task"   # non-interactive
megabyte --list-models
```

Config and extensions live in `~/.megabyte/agent/` (seeded from `megabyte/agent/`).
Add a tool by dropping a `*.ts` file in `~/.megabyte/agent/extensions/`.

## Note

pi's core includes a `Bash` tool (shell execution). That is powerful; use it only
with trusted tasks. megabyte does not add offensive/attack capabilities.

The previous Python implementation is archived at the `python-final` tag of the
`megabyte-python` repository.
