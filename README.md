<div align="center">

# git-search

**Search git history by message, code change, file path, author, or date — from the terminal**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?labelColor=0B0A09)](LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?labelColor=0B0A09)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?labelColor=0B0A09)](package.json)

</div>

## Install

```bash
npx github:NickCirv/git-search "query"
```

## Usage

```bash
# Search commit messages
npx github:NickCirv/git-search "TODO"

# Search code changes (added/removed lines)
npx github:NickCirv/git-search --code "apiKey" --since "6 months ago"
```

| Flag | Description |
|------|-------------|
| `--code <query>` | Search actual code changes (added/removed lines) |
| `--file <pattern>` | Search by file path pattern (e.g. `*.env`, `src/**`) |
| `--author <name>` | Filter by commit author |
| `--since <date>` | Start date (`"3 months ago"`, `"2024-01-01"`) |
| `--until <date>` | End date |
| `--type <type>` | Conventional commit type (`feat`, `fix`, `chore`, etc.) |
| `-i` / `--ignore-case` | Case-insensitive search |
| `-e` / `--regex` | Treat query as regex |
| `--context <n>` | Context lines around matches (default: 2) |
| `--max-results <n>` | Stop after N commits (default: 50) |
| `--count` | Show match count only |
| `--no-color` | Disable color output |

## What it does

`git log` is powerful but verbose. `git-search` wraps git's pickaxe and grep commands into a focused CLI with highlighted matches and readable output. Run it in any git repo with no setup — pure Node.js, zero dependencies, no install required.

---
<sub>Zero dependencies · Node 18+ · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
