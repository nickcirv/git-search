#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgYellow: '\x1b[43m\x1b[30m',
  gray: '\x1b[90m',
};

const HELP = `
${C.bold}git-search${C.reset} — Powerful search across git history

${C.bold}USAGE${C.reset}
  git-search [options] <query>
  gs [options] <query>

${C.bold}SEARCH MODES${C.reset}
  ${C.cyan}git-search "TODO"${C.reset}                  Search commit messages
  ${C.cyan}git-search --code "apiKey"${C.reset}         Search code changes (added/removed lines)
  ${C.cyan}git-search --file "*.env"${C.reset}          Search by file path pattern

${C.bold}FILTERS${C.reset}
  --author <name>                Filter by commit author
  --since <date>                 Start date (e.g. "3 months ago", "2024-01-01")
  --until <date>                 End date
  --type <type>                  Conventional commit type (feat, fix, chore, etc.)

${C.bold}OPTIONS${C.reset}
  -i, --ignore-case              Case insensitive search
  -e, --regex                    Treat query as regex pattern
  --context <n>                  Context lines around matches (default: 2)
  --max-results <n>              Stop after N commits (default: 50)
  --count                        Show match count only
  --no-color                     Disable color output
  -h, --help                     Show this help

${C.bold}EXAMPLES${C.reset}
  git-search "TODO"
  git-search --code "password" --author "Nick" --since "1 year ago"
  git-search --file "*.env" --since "6 months ago"
  git-search --type fix --since "3 months ago"
  git-search -e "api[Kk]ey" --code -i

${C.bold}INSTALL${C.reset}
  npx git-search <query>
  npm install -g git-search
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    query: null,
    code: false,
    file: null,
    author: null,
    since: null,
    until: null,
    type: null,
    ignoreCase: false,
    regex: false,
    context: 2,
    maxResults: 50,
    count: false,
    color: true,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--code': opts.code = true; break;
      case '--file': opts.file = args[++i]; break;
      case '--author': opts.author = args[++i]; break;
      case '--since': opts.since = args[++i]; break;
      case '--until': opts.until = args[++i]; break;
      case '--type': opts.type = args[++i]; break;
      case '-i': case '--ignore-case': opts.ignoreCase = true; break;
      case '-e': case '--regex': opts.regex = true; break;
      case '--context': opts.context = parseInt(args[++i], 10) || 2; break;
      case '--max-results': opts.maxResults = parseInt(args[++i], 10) || 50; break;
      case '--count': opts.count = true; break;
      case '--no-color': opts.color = false; break;
      case '-h': case '--help': opts.help = true; break;
      default:
        if (!a.startsWith('-')) opts.query = a;
    }
  }
  return opts;
}

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    if (err.stderr && err.stderr.includes('not a git repository')) {
      console.error('Error: not a git repository');
      process.exit(1);
    }
    return '';
  }
}

function highlight(text, query, opts, color) {
  if (!color || !query) return text;
  const flags = opts.ignoreCase ? 'gi' : 'g';
  const pattern = opts.regex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  return text.replace(pattern, m => `${C.bgYellow}${m}${C.reset}`);
}

function formatDate(raw) {
  // raw from --date=short is YYYY-MM-DD
  return raw.trim();
}

function buildLogArgs(opts) {
  const format = '--format=%H|%an|%ad|%s';
  const dateFlag = '--date=short';
  const base = ['log', '--all', format, dateFlag];

  if (opts.author) base.push(`--author=${opts.author}`);
  if (opts.since) base.push(`--since=${opts.since}`);
  if (opts.until) base.push(`--until=${opts.until}`);
  if (opts.type && opts.query) {
    // handled via grep filter after
  }

  const query = opts.query;

  if (opts.code) {
    if (opts.regex) {
      if (query) base.push(`-G${query}`);
    } else {
      if (query) base.push(`-S${query}`);
      if (opts.ignoreCase && !opts.regex) base.push('--pickaxe-regex', `-S(?i)${query}`);
    }
  } else {
    // message search
    if (query) {
      if (opts.ignoreCase) base.push('-i');
      base.push(`--grep=${opts.type ? opts.type + ': ' : ''}${query}`);
    } else if (opts.type) {
      if (opts.ignoreCase) base.push('-i');
      base.push(`--grep=^${opts.type}[:(]`);
    }
  }

  if (opts.file) {
    base.push('--', opts.file);
  }

  return base;
}

function parseCommits(raw) {
  return raw.split('\n').filter(l => l.trim() && l.includes('|')).map(line => {
    const [hash, author, date, ...msgParts] = line.split('|');
    return { hash: hash.trim(), author: author.trim(), date: date.trim(), message: msgParts.join('|').trim() };
  });
}

function getDiff(hash) {
  return git('show', hash, '--format=', '-U3', '--no-color');
}

function parseDiffLines(diff, query, opts) {
  const lines = diff.split('\n');
  const results = [];
  let currentFile = null;
  let lineNum = 0;

  const flags = opts.ignoreCase ? 'i' : '';
  const pattern = opts.regex
    ? new RegExp(query, flags)
    : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('diff --git')) {
      const m = line.match(/b\/(.+)$/);
      currentFile = m ? m[1] : null;
      lineNum = 0;
      continue;
    }
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      lineNum = m ? parseInt(m[1], 10) - 1 : 0;
      continue;
    }
    if (line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) continue;

    if (line.startsWith('+') || line.startsWith('-')) lineNum++;
    else if (!line.startsWith('\\')) lineNum++;

    if ((line.startsWith('+') || line.startsWith('-')) && pattern.test(line.slice(1))) {
      // Gather context
      const ctx = [];
      const before = Math.max(0, i - opts.context);
      const after = Math.min(lines.length - 1, i + opts.context);
      for (let j = before; j <= after; j++) {
        ctx.push({ line: lines[j], isMatch: j === i });
      }
      results.push({ file: currentFile, lineNum, context: ctx });
    }
  }
  return results;
}

function separator(color) {
  const line = '━'.repeat(40);
  return color ? `${C.gray}${line}${C.reset}` : line;
}

function run() {
  const opts = parseArgs(process.argv);
  const color = opts.color && process.stdout.isTTY !== false;

  if (opts.help || (!opts.query && !opts.file && !opts.type && !opts.author && !opts.since)) {
    console.log(HELP);
    process.exit(0);
  }

  // Verify git repo
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'pipe' });
  } catch {
    console.error('Error: not a git repository (or any of the parent directories)');
    process.exit(1);
  }

  const logArgs = buildLogArgs(opts);
  const raw = git(...logArgs);
  let commits = parseCommits(raw);

  // Additional type filter for code search (--type with --code)
  if (opts.type && opts.code) {
    const typePattern = new RegExp(`^${opts.type}[:(]`, opts.ignoreCase ? 'i' : '');
    commits = commits.filter(c => typePattern.test(c.message));
  }

  commits = commits.slice(0, opts.maxResults);

  if (opts.count) {
    if (color) {
      console.log(`${C.bold}${commits.length}${C.reset} commits match`);
    } else {
      console.log(`${commits.length} commits match`);
    }
    return;
  }

  if (commits.length === 0) {
    const q = opts.query || opts.file || '';
    console.log(color ? `${C.dim}No matches for "${q}"${C.reset}` : `No matches for "${q}"`);
    return;
  }

  const label = opts.code ? 'code changes' : opts.file ? 'file path' : 'commit messages';
  const queryDisplay = opts.query || opts.file || '';

  if (color) {
    console.log(`\n${C.bold}git-search${C.reset} · ${C.yellow}${commits.length}${C.reset} match${commits.length !== 1 ? 'es' : ''} for ${C.cyan}"${queryDisplay}"${C.reset} in ${label}`);
  } else {
    console.log(`\ngit-search · ${commits.length} match${commits.length !== 1 ? 'es' : ''} for "${queryDisplay}" in ${label}`);
  }
  console.log(separator(color));

  for (const commit of commits) {
    const hashShort = commit.hash.slice(0, 7);
    const msgHighlighted = (!opts.code && opts.query)
      ? highlight(commit.message, opts.query, opts, color)
      : commit.message;

    if (color) {
      console.log(`\n${C.bold}${C.yellow}${hashShort}${C.reset}  ${C.dim}${commit.date}${C.reset}  ${C.magenta}${commit.author}${C.reset}  ${msgHighlighted}`);
    } else {
      console.log(`\n${hashShort}  ${commit.date}  ${commit.author}  ${commit.message}`);
    }

    if (opts.code && opts.query) {
      const diff = getDiff(commit.hash);
      const matches = parseDiffLines(diff, opts.query, opts);
      if (matches.length === 0) continue;

      for (const m of matches) {
        if (color) {
          console.log(`  ${C.cyan}${m.file}:${m.lineNum}${C.reset}`);
        } else {
          console.log(`  ${m.file}:${m.lineNum}`);
        }
        for (const ctxLine of m.context) {
          const l = ctxLine.line;
          let formatted;
          if (ctxLine.isMatch) {
            const prefix = l[0];
            const rest = highlight(l.slice(1), opts.query, opts, color);
            if (color) {
              const prefixColor = prefix === '+' ? C.green : prefix === '-' ? C.red : C.reset;
              formatted = `    ${prefixColor}${prefix}${C.reset} ${rest}`;
            } else {
              formatted = `    ${prefix} ${l.slice(1)}`;
            }
          } else {
            if (color) {
              formatted = `  ${C.dim}  ${l}${C.reset}`;
            } else {
              formatted = `    ${l}`;
            }
          }
          console.log(formatted);
        }
      }
    } else if (opts.file) {
      // For file search, show which files matched
      const diff = getDiff(commit.hash);
      const changedFiles = [];
      for (const line of diff.split('\n')) {
        if (line.startsWith('diff --git')) {
          const m = line.match(/b\/(.+)$/);
          if (m) changedFiles.push(m[1]);
        }
      }
      const flags = opts.ignoreCase ? 'i' : '';
      const pat = opts.file.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
      const filePattern = new RegExp(pat, flags);
      const matched = changedFiles.filter(f => filePattern.test(f));
      for (const f of matched) {
        if (color) {
          console.log(`  ${C.cyan}${f}${C.reset}`);
        } else {
          console.log(`  ${f}`);
        }
      }
    }
  }

  console.log('\n' + separator(color) + '\n');
}

run();
