# Security Audit — Chicane.ai

**Audited:** 2026-04-28  
**Scope:** Full git history (29 commits, both branches) + current working tree  
**Method:** `git log -p --all` pattern analysis (gitleaks not installed; fallback used)  
**Auditor:** Claude Code (claude-sonnet-4-6)

---

## Executive Summary

**No credentials, API keys, tokens, or passwords were found** in any commit or current file.  
The repository is clean of secrets. Three low-severity hardening gaps are documented below.

---

## Findings

### Finding 1 — `cache/fastf1_http_cache.sqlite` is tracked by git

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Status** | Present in current repo (modified, unclean working tree) |
| **File** | `cache/fastf1_http_cache.sqlite` |
| **Introduced** | Early history (tracked from initial commits) |
| **Commit** | Multiple — file is continuously modified as cache grows |

**Issue:** This binary SQLite file stores FastF1 HTTP response cache. It is tracked by git and included in every push. While it contains no credentials today, HTTP caches can theoretically store response headers (including any `Authorization` headers from proxied requests). More practically, it bloats the repository and makes diffs noisy.

**Recommendation:** Add `cache/` and `*.sqlite` to `.gitignore`, then remove the file from tracking with:
```bash
git rm --cached cache/fastf1_http_cache.sqlite
```

---

### Finding 2 — `.claude/settings.local.json` is tracked by git

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Status** | Present in current repo — currently contains only permission rules, no secrets |
| **File** | `.claude/settings.local.json` |
| **Introduced** | Present in current working tree |

**Issue:** `settings.local.json` is a machine-local Claude Code config file. It is intended to hold per-developer settings and could in future be used to store environment-specific tokens or paths. Tracking it in git is a pre-condition for an accidental secret commit.

**Recommendation:** Add `.claude/settings.local.json` to `.gitignore` and untrack it:
```bash
git rm --cached .claude/settings.local.json
```
If shared Claude Code permissions are desired, use `.claude/settings.json` (already separate) rather than `settings.local.json`.

---

### Finding 3 — `.gitignore` gaps

| Field | Detail |
|---|---|
| **Severity** | Low (preventive) |
| **Status** | No secrets exposed today; gap increases future risk |

**Issue:** The root `.gitignore` does not cover:
- `cache/` directory or `*.sqlite` files
- `.claude/settings.local.json`
- `backend/.env` (covered by root `.env` rule, but not explicit)

**Recommendation:** Add the following to `.gitignore`:
```
# Cache
cache/
*.sqlite
*.db

# Claude Code local settings
.claude/settings.local.json
```

---

## Scan Coverage

| Area | Result |
|---|---|
| All 29 commits (full `git log -p`) | Clean — no secrets |
| Current working tree (all tracked files) | Clean — no secrets |
| `.env` files ever committed | None — only `.env.example` (placeholders only) |
| `.env.example` contents | All placeholder/template values, no real credentials |
| `backend/app/main.py` | `allow_credentials=True` (CORS config) — not a secret |
| `package-lock.json` | SHA-512 integrity hashes — not secrets |
| Provider-specific patterns checked | AWS (`AKIA…`), OpenAI (`sk-…`), GitHub (`ghp_`, `gho_`, `github_pat_`), Stripe, Twilio, Firebase, Anthropic, Slack (`xoxb-`) |
| High-entropy base64 strings | None matching secret patterns |
| Files with secret-like names ever in history | None |
| Git stash | Empty |

---

## Actions Required

| Priority | Action |
|---|---|
| Rotate immediately | None — no leaked credentials found |
| Rotate when convenient | None |
| Hygiene (do before next push) | Untrack `cache/fastf1_http_cache.sqlite` and `.claude/settings.local.json`; update `.gitignore` |

---

## Notes

- Repository is public on GitHub (`github.com/akakarantzas/chicane-ai`). Any secret accidentally committed would have been immediately exposed. The clean scan result is therefore important.
- Install [gitleaks](https://github.com/gitleaks/gitleaks) (`winget install gitleaks` or `brew install gitleaks`) for faster, rule-based scanning in future audits.
- Consider adding a pre-commit hook or CI step to run `gitleaks protect --staged` on every commit to prevent future accidental secret commits.
