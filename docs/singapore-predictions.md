# Singapore GP forecast publication

The Predictions tab and homepage preview consume
`GET /api/predictions/next-race`, which now serves
`backend/app/models/singapore_predictions.json` and
`backend/app/models/singapore_metadata.json`.

The standalone training project is
[f1-2026-singapore-grand-prix-winner-prediction](https://github.com/akakarantzas/f1-2026-singapore-grand-prix-winner-prediction).
Its local checkout is `.tmp-singapore-model-repo`. The app serves the JSON exports
without loading the model pickle or retraining during a request.

## Published snapshot

- Race: Singapore GP, October 11, 2026, Marina Bay Street Circuit.
- Model: `singapore-hgb-calibrated-1.0`, generated September 28, 2026.
- Training: 1,748 driver results across 86 races, 2022 Singapore through 2026 Azerbaijan.
- Circuit features: Singapore experience and prior Singapore win rate.
- Stage: Pre-Qualifying, projected grid based on recent qualifying form.
- Entry list: projected from the latest lineup; no confirmed Singapore entry list is claimed.
- Forecast: 22 distinct drivers with normalized probabilities; Russell 37.04%,
  Norris 13.13%, Leclerc 12.50% are the top three.

The blend was tuned on races through 2025. Separate 2026 walk-forward backtests
cover 15 completed races, with 9 top-one and 13 top-three winner rankings. These
are historical multi-circuit measurements, not Singapore forecast accuracy.

## Updating

Post-qualifying updates are now automatic while the backend runs. The worker
checks official session completion and the full qualifying classification, then
uses the saved model and frozen inputs to update the forecast. Both stages are
preserved in History. See [post-qualifying operation and validation](post-qualifying-predictions.md).

Train the standalone project, validate its outputs, and publish them in its root.
Then run this command from the app root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync_azerbaijan_model.ps1 -SourceRepo .tmp-singapore-model-repo -PredictionName singapore -IncludeModel
```

The existing sync script accepts any prediction name. It archives the forecast
before copying the artifacts. The Singapore manifest is included in
`backend/app/models/forecast-archive/` so deployments can restore this recorded
forecast. Past Azerbaijan artifacts and History entries remain available.

## Verification

- Seven model regression tests passed in the standalone Docker image.
- All 347 backend tests and 43 frontend tests passed.
- The frontend production build passed.
- Frontend API rendering checks show Singapore Grand Prix Predictions and
  Marina Bay Street Circuit, and reject the former Azerbaijan heading.
