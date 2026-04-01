![Banner](banner.svg)

# git-search
> Powerful search across git history. Messages, code changes, files, authors, dates.

```bash
npx git-search "TODO"
npx git-search --code "apiKey" --since "6 months ago"
```

```
git-search · 3 matches for "apiKey"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abc123f  2025-11-15  Nick  feat: add API key rotation
  src/auth/keys.js:42
  + const apiKey = generateKey();

def456a  2025-09-03  Sarah  fix: remove hardcoded apiKey
  config/dev.js:8
  - const apiKey = "sk-12345"
  + const apiKey = process.env.API_KEY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Commands
| Command | Description |
|---------|-------------|
| `git-search "text"` | Search commit messages |
| `--code "text"` | Search code changes |
| `--file "*.env"` | Search by file pattern |
| `--author <name>` | Filter by author |
| `--since "3 months ago"` | Date range |
| `-e` | Regex pattern |

## All Options

| Flag | Description |
|------|-------------|
| `--code <query>` | Search actual code changes (added/removed lines) |
| `--file <pattern>` | Search by file path pattern (e.g. `*.env`, `src/**`) |
| `--author <name>` | Filter commits by author name |
| `--since <date>` | Start date (`"3 months ago"`, `"2024-01-01"`) |
| `--until <date>` | End date |
| `--type <type>` | Conventional commit type (`feat`, `fix`, `chore`, etc.) |
| `-i` / `--ignore-case` | Case insensitive search |
| `-e` / `--regex` | Treat query as regex pattern |
| `--context <n>` | Context lines around matches (default: 2) |
| `--max-results <n>` | Stop after N commits (default: 50) |
| `--count` | Show match count only |
| `--no-color` | Disable color output |

## Examples

```bash
# Search commit messages
git-search "TODO"
git-search "breaking change" --since "1 year ago"

# Search code changes
git-search --code "apiKey"
git-search --code "password" --author "Nick" --since "1 year ago"

# Search by file path
git-search --file "*.env"
git-search --file "config/*.json" --since "6 months ago"

# Regex mode
git-search -e "api[Kk]ey" --code -i

# Conventional commits
git-search --type fix --since "3 months ago"

# Combined
git-search --code "secret" --author "Nick" --since "2 years ago" --until "1 year ago"

# Count only
git-search "TODO" --count
```

## Install

```bash
# Run without installing
npx git-search "query"

# Install globally
npm install -g git-search
```

## Why

`git log` is powerful but verbose. `git-search` wraps the best git pickaxe and grep commands with:

- **Highlighted matches** in context
- **Zero setup** — works in any git repo
- **Zero dependencies** — pure Node.js, ships nothing

---
**Zero dependencies** · **Node 18+** · Made by [NickCirv](https://github.com/NickCirv) · MIT
