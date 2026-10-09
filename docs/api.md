# API reference

Local base URL: `http://127.0.0.1:8000`. Start the backend using the
[setup instructions](../README.md#backend).

- [Swagger UI](http://127.0.0.1:8000/docs): interactive requests.
- [OpenAPI JSON](http://127.0.0.1:8000/openapi.json): generated schema.
- No API key or authentication is required by the application.
- Responses are JSON. Send contact requests with `Content-Type: application/json`.
- A `null` statistic means unavailable, not zero. HTTP 200 can include unavailable
  data; inspect the response's status fields.

Examples below use PowerShell. Response excerpts are illustrative, not live results.
Only the next-race endpoint currently declares a detailed response model in OpenAPI;
the remaining response fields are described here.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check whether the backend responds |
| GET | `/api/predictions/next-race` | Read the active race-winner forecast |
| GET | `/api/predictions/history` | Read archived forecasts with published outcomes |
| GET | `/api/h2h/compare` | Compare two drivers' season statistics |
| GET | `/api/h2h/predict` | Estimate which driver finishes ahead |
| GET | `/api/h2h/monitoring` | Read recorded H2H performance summaries |
| POST | `/api/contact` | Send a contact message |

## Health

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/health'
```

No parameters. Returns `200` with `{"status":"ok"}`. This checks the application,
not external data providers or email delivery.

## Race-winner forecast

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/predictions/next-race'
```

No parameters. Currently serves the Singapore artifacts; the endpoint name does
not imply automatic selection of the next calendar race. Returns `Cache-Control: no-store`.

| Field | Meaning |
| --- | --- |
| `race`, `circuit` | Race and circuit names |
| `predictions` | Descending probability order; each item has `driver`, `team`, and numeric `probability` on a 0–1 scale |
| `model_version`, `generated_at` | Model identifier and generation timestamp; may be null |
| `status` | `Pre-Qualifying` or `Post-Qualifying` |
| `automatic_update_enabled` | Whether both automatic updates and forecast history are enabled; does not guarantee an update is available |
| `metadata` | Training counts plus `validation`, `prediction_postprocess`, `prediction_input`, and `backtest_summary` objects |

Prediction item example:

```json
{"driver":"Russell","team":"Mercedes","probability":0.3704}
```

The display completes the 2026 driver grid with small fallback values for missing
drivers. The archive retains the original forecast values. Reading this endpoint
also attempts to archive eligible pre-race forecasts. Missing, malformed, or invalid
prediction/metadata artifacts return `500`.

See [post-qualifying updates](post-qualifying-predictions.md) for publication rules.

## Prediction history

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/predictions/history'
```

No parameters or pagination. Returns `Cache-Control: no-store`. A request can
refresh the archive and results, subject to the shared refresh cooldown.

```json
{"races":[],"pending_count":0,"status":"ready","checked_at":"2026-10-09T10:00:00+00:00"}
```

- `status`: `ready`, `stale` (refresh failed), `disabled`, or `unavailable`.
- `checked_at`: last refresh-attempt timestamp, or null.
- `pending_count`: archived races that have started but lack accepted results.
- `races`: completed race cards, newest first. Each contains `id`, `race`,
  `circuit`, `raceDate`, display `date`, `actualWinner`, `winnerFullName`,
  `actualResults`, `resultSource`, and `forecasts`.
- Each forecast has `id`, `recordedAt`, `generatedAt`, `status`, `modelVersion`,
  `predictions`, and `actualWinner`. The newest forecast's fields also appear on
  the card; the card's `id` remains the race ID.

Future races are omitted. The frontend's static historical imports are separate
from this response. See [history operations](prediction-history.md) for archiving
and result acceptance rules.

## H2H: shared inputs

Both H2H comparison and prediction require two different driver codes. Leading
and trailing whitespace is removed; codes are case-insensitive.

Supported codes from the application's 2026 roster:

```text
NOR PIA RUS ANT VER HAD LEC HAM ALB SAI LIN LAW STR ALO
OCO BEA HUL BOR GAS COL PER BOT
```

Missing required parameters return `422`. Unknown or identical drivers return
`400`. A calendar-provider failure can return `502`; missing result data can
instead produce `200` with partial or unavailable fields.

### Compare season statistics

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/h2h/compare?driver1=NOR&driver2=PIA&year=2026'
```

| Query parameter | Type | Required/default |
| --- | --- | --- |
| `driver1`, `driver2` | string | Both required |
| `year` | integer | Defaults to `2026`; supports `2024`, `2025`, `2026` |

Returns `year`, `scope` (`season`), `driver1`, `driver2`, and four metadata objects:

| Object | Meaning |
| --- | --- |
| `coverage` | Loaded and missing race coverage |
| `freshness` | `snapshot_id`, `status` (`fresh`, `stale`, `unavailable`), retrieval/attempt times, age, TTL, retry delay, refresh error, and `partial` flag |
| `quality` | Source reconciliation and conflict information |
| `standings` | Championship standings provenance and availability |

Each driver object includes identity (`abbreviation`, `full_name`, `team`, `number`),
`wins`, `podiums`, `races`, `best_finish`, `avg_finish`, `finish_sample_size`,
`excluded_results`, `stats_status`, `gp_points`, `points`, `champ_position`, and
`championship_status`.

`points` and `champ_position` come from validated championship standings, including
sprint points. `gp_points` and finish statistics describe loaded Grand Prix results;
they do not guarantee complete season coverage. Unsupported years return `400`;
a non-integer year returns `422`.

### Predict who finishes ahead

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/h2h/predict?driver1=NOR&driver2=PIA'
```

| Query parameter | Type | Required/default |
| --- | --- | --- |
| `driver1`, `driver2` | string | Both required |
| `snapshot_id` | string | Optional; pins the current-season snapshot from compare's `freshness.snapshot_id` |

Uses 2024–2026 history before the target event; there is no `year` parameter.
Only use a snapshot from a current-season comparison. An expired or lost pin
returns `409`; compare again and retry with the new ID. Pins are held in memory
for at most three versions per season and 24 hours, and are lost on restart.

**Core result**

Read `prediction_status` first, then the favorite and explanation. Example excerpt
when neither driver has eligible history (other response fields omitted):

```json
{
  "target": "finish_ahead",
  "prediction_status": "insufficient_data",
  "predicted_winner": null,
  "score_type": "uncalibrated_heuristic",
  "confidence": null,
  "h2h_record": {
    "driver1_wins": 0,
    "driver2_wins": 0,
    "total_races": 0,
    "tied_races": 0,
    "excluded_races": 0
  },
  "reasoning": "Not enough eligible Grand Prix results for both drivers to make a prediction."
}
```

| Field | Meaning |
| --- | --- |
| `next_race`, `next_event` | Target race name and schedule; event can be null |
| `prediction_status` | Availability or reason for withholding a favorite; see below |
| `predicted_winner`, `predicted_winner_full_name`, `predicted_winner_team` | Selected favorite; null when abstaining |
| `driver1_score`, `driver2_score`, `score_type` | Uncalibrated heuristic scores, **not probabilities** |
| `confidence` | Deprecated; always null |
| `h2h_record` | `driver1_wins`, `driver2_wins`, `total_races`, `tied_races`, `excluded_races`, in selected-driver order |
| `reasoning` | Plain-language explanation of the result |

| `prediction_status` | Meaning |
| --- | --- |
| `available` | A favorite is available |
| `insufficient_data` | At least one driver has no eligible history |
| `insufficient_evidence` | Too few eligible races or unverifiable chronology |
| `no_clear_favorite` | Scores are tied or too close |
| `data_unavailable` | Current-season results are unavailable or missing due races |
| `no_upcoming_race` | No future Grand Prix is listed |
| `schedule_time_unknown` | The target race's start time is unconfirmed |

These are HTTP 200 outcomes. Show a favorite only when the response supplies one.

**Supporting evidence**

| Field | Meaning |
| --- | --- |
| `target`, `target_description`, `rule_version`, `model_version` | Prediction definition and version identifiers |
| `driver1_avg_finish`, `driver2_avg_finish` | Each driver's average eligible finish |
| `driver1_recent_form`, `driver2_recent_form` | Each driver's recent-form input |
| `driver1_win_rate`, `driver2_win_rate` | Each driver's share of eligible shared H2H wins |
| `explanation` | Weighted score components in selected-driver order |
| `uncertainty` | Evidence counts, score margin, abstention reasons, data warnings, and unavailable probability fields |
| `history_scope`, `history_cutoff`, `recent_form` | History years, target cutoff, and chronological recent-form evidence |
| `coverage`, `snapshots` | Per-year coverage and snapshot quality/freshness; omitted when there is no confirmed target |
| `monitoring` | Recording status: `recorded`, `already_recorded`, `disabled`, `not_recorded`, or `unavailable` |

This GET can record the first eligible pre-race forecast and reconcile saved
outcomes using loaded results. See [H2H rules](h2h.md),
[uncertainty](h2h-uncertainty.md), and [recording behavior](h2h-monitoring.md).

### H2H monitoring

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/h2h/monitoring'
```

No parameters. Read-only: does not fetch provider results or record predictions.

```json
{"status":"no_records","groups":[]}
```

`status` is `available`, `no_records`, `disabled`, or `unavailable`. Groups are
separated by `model_version`, `rule_version`, and `policy_version`. Each includes:

- `overall`: logged, eligible, decided, pending, excluded, and abstained pair
  counts; `abstention_rate`, `decision_coverage`, and `accuracy`.
- `races`, `race_macro_accuracy`, `scored_races`: per-race metrics and the equally
  weighted average of scored-race accuracies.
- `trend`: latest five versus previous five scored races; unavailable until ten
  races are scored. Also includes `result_revisions` and `latest_outcome_at` at
  group level.

Rates use a 0–1 scale and are null when there is no denominator. Summaries measure
forecasts requested on this installation, not every possible driver pairing.

## Contact

```powershell
$body = @{ name = 'Alex'; email = 'alex@example.com'; message = 'Hello!' } | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:8000/api/contact' -Method Post -ContentType 'application/json' -Body $body
```

This request sends a real email when delivery is configured.

| JSON field | Type | Validation |
| --- | --- | --- |
| `name` | string or null | Optional; missing/blank names become `Anonymous` |
| `email` | string | Required; validated after trimming whitespace |
| `message` | string | Required; 1–2,000 characters after trimming |

Success: `200` with `{"success":true}`. Limit: three submissions per client IP
per rolling hour, stored in memory. Attempts that pass input validation consume
the limit even if configuration or delivery subsequently fails.

Errors: `422` invalid input, `429` rate limit, `500` email service not configured,
or `502` delivery failed. Configure `RESEND_API_KEY` and `CONTACT_EMAIL` on the server.

## Errors and client handling

Application errors normally return a string in `detail`:

```json
{"detail":"Drivers must be different."}
```

Framework validation errors return `422` with a `detail` array describing invalid
or missing fields. Contact's custom validation also uses `422`, with a string.
Clients should handle both forms.

Inspect data-status fields even after HTTP success. Preserve useful prior data
during failed refreshes and display freshness information. Run a single backend
worker for consistent H2H snapshot pins and in-memory state; see the
[deployment notes](h2h.md).
