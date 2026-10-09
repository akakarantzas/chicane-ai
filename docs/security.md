# Security and deployment

## Deployment actions

1. Store the Resend delivery key only in the backend's secret environment or an
   ignored `backend/.env`. Use a sending-only key restricted to the appropriate
   domain where supported. Keep the contact recipient server-side. Never place
   credentials in `VITE_` settings, model metadata, public files, URLs, or queries.
2. Serve only `frontend/dist` through the static host. Do not expose the repository
   root, backend directory, `.git`, logs, databases, or environment files. Deploy
   through HTTPS and set `CORS_ORIGINS` to the actual frontend origins.
3. Use one backend worker with the current in-memory caches and limiters. Limits
   reset on restart and are per process; multiple instances need shared limits
   at a gateway or datastore. Add edge connection/concurrency limits and request
   timeouts; application quotas alone do not stop distributed denial of service.
4. Configure Uvicorn to trust forwarded client addresses only from the actual
   reverse proxy, and prevent direct access around it. The application does not
   read `X-Forwarded-For` itself. Untrusted proxy headers permit quota bypass;
   missing proxy configuration can make all visitors share one IP quota.
5. Keep provider/HTTP debug logging disabled in production. Configure the proxy,
   server, and log collector to omit credentials, request bodies, authorization
   headers, and cookies. Review older logs generated before this fix; this audit
   cannot sanitize logs stored outside the workspace.
6. If any credential is found in past commits, bundles, responses, or logs,
   **revoke and rotate it immediately**. Update the backend secret, redeploy, and
   remove leaked artifacts/logs. Deleting code or rewriting Git history does not
   invalidate an exposed credential. No specific exposed credential was found
   in this audit to mandate a rotation.

## Audit result — October 9, 2026

No exposed credential was identified in the local project or Git history.
Gitleaks 8.30.1 scanned the working directory and history across local refs and
reflogs with full redaction; both scans returned zero findings. A separate
pattern scan also inspected configuration, logs, model artifacts, the frontend
bundle, and Git objects. The local repository was not shallow and had 141
commits reachable from its refs at audit time.

Only placeholder `.env.example` files were present; no actual `.env` files were
available to audit. The frontend uses `VITE_API_BASE_URL`, which is public
configuration. No private credential or source map was found in the production
build. Resend email delivery already ran on the backend; no privileged browser
call needed moving.

This is a local source and artifact audit, not proof that no secret has ever
leaked. Hosting variables, deployed responses/bundles, remote CI logs, external
log stores, backups, un-fetched/deleted remote refs, dependency internals, and
archived/compressed content were not exhaustively audited. Pattern scanners can
miss arbitrary passwords or unfamiliar credential formats. No credentials were
tested against a provider.

## Changes from this audit

- Expanded Git exclusions for environment variants, private-key containers,
  credential files, and logs; kept `.env.example` templates trackable.
- Removed raw email-provider bodies and exception text from contact logs, raw
  provider errors from H2H responses, and tracebacks from application recovery
  logs. Failures retain fixed diagnostic messages and safe status codes.
- Bounded contact fields, rejected unknown fields, and removed submitted values
  from framework validation responses. The contact UI handles these errors.
- Added atomic, bounded in-memory rate limits, including worker-wide email
  quotas, plus body/query limits and `Retry-After` responses. Invalid contact
  attempts count toward the quota. See the [API reference](api.md) for limits.
- Restricted CORS to GET/POST and Content-Type, without credentialed requests.
- Restricted Vite's public environment to `VITE_API_BASE_URL`; builds reject
  credentials, queries, or fragments in that URL. Production source maps are
  explicitly disabled. These safeguards do not make frontend values private.

## Authentication and authorization

Current API routes expose public racing data, aggregate forecast monitoring, and
a public contact form. There are no account-specific records, client-selected
email recipients, public forecast uploads, or administrative mutation routes.
They intentionally remain unauthenticated. The contact backend reads both the
delivery credential and recipient from server environment variables.

Forecast recording on GET requests uses server-selected artifacts, timestamps,
and validated driver selections; clients cannot submit replacement forecasts or
outcomes. Operator imports remain local commands, outside the HTTP API.

CORS and hidden URLs are not access control. If accounts, private records, admin
actions, or paid data are added, require verified server-side authentication and
resource-level authorization before publishing those routes. Never use a shared
secret embedded in the frontend to simulate authentication.

Checks: 388 backend tests, 54 frontend tests, production build, and frontend
dependency audit passed. Security tests cover provider-error leakage, bounded
input, concurrent quotas, quota expiry, oversized chunked bodies, CORS, and public
environment configuration. Two existing Python dependency deprecation warnings
remain.

References: [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
and [REST security guidance](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
