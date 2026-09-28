# Automatic post-qualifying forecasts

Singapore now has two forecast stages. The existing pre-qualifying JSON remains
the baseline. A background worker replaces its projected grid positions with
published Grand Prix qualifying positions and runs inference using the saved
model. The Predictions tab and homepage poll every 60 seconds and display the
latest stage without a reload.

## Publication rules

- The backend checks every 60 seconds while running. It starts checking the
  qualifying provider within four days of the confirmed race start.
- FastF1 identifies the exact Grand Prix `Q` session and its official F1 archive
  path. The worker requires `ArchiveStatus.json` to report `Complete`; sprint
  qualifying and intermediate Q1/Q2 classifications cannot trigger publication.
- Race IDs are discovered from the official season results index, not inferred
  from calendar round numbers. Positions come from the official qualifying
  table, for example [Azerbaijan 2026](https://www.formula1.com/en/results/2026/races/1295/azerbaijan/qualifying).
- The complete driver roster, team identities, unique driver codes and unique
  positions must match the model. Missing classifications, substitutions,
  unclassified entries or unsupported page changes defer publication for review.
- Qualifying order is used as the grid estimate. It is **not** the final starting
  grid after penalties. Q1/Q2/Q3 times are not features in the current model.
- Revisions to a valid classification trigger another forecast before race start.
  Unchanged positions do not create another forecast. No forecast is generated
  retrospectively after the race starts.
- Failed fetches or inference leave the latest successful forecast available.
  Both stages are recorded in prediction history before the new forecast becomes
  visible. History offers them for comparison when race results are available.

Updates arrive after both the official completion marker and full classification
are published, generally within one backend polling interval plus inference time.
An already-open browser has its own polling interval of up to another minute.
This is not a guarantee of an update immediately at the chequered flag.

## Model artifacts

The Singapore model repository now exports `singapore_inference.json` alongside
its predictions, metadata and pickle. It contains frozen pre-race feature rows,
the expected scikit-learn version, a model checksum and the baseline forecast
checksum. A baseline parity check must reproduce the published probabilities
exactly before the worker substitutes qualifying positions. All other features
and the existing probability blend remain frozen.

The model trainer exports this bundle on future runs. To add it to the existing
published snapshot without retraining, run from the model repository with the
original race cache and dependencies:

```powershell
python train_singapore.py --export-inference-only
```

For Docker, set `OUTPUT_DIR=/app` and mount the model repository at `/app` when
exporting from its root snapshot; normal training exports to `/app/artifacts`.
Copy the full matching artifact set using:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync_azerbaijan_model.ps1 -SourceRepo .tmp-singapore-model-repo -PredictionName singapore -IncludeModel
```

The sync includes the inference bundle when present. For another GP, export
that model's frozen features with the same schema and circuit win-rate feature,
then update the active forecast paths and worker model name together. Earlier
completed races retain their original pre-qualifying forecasts.

## Operation

Install `backend/requirements.txt` (including the model's pinned scikit-learn
version) and restart the backend to start the worker. Both
`POST_QUALIFYING_ENABLED` and `PREDICTION_HISTORY_ENABLED` default to `true`.
Disabling history also disables automatic generation because both stages must
be archived before publication. Run one backend worker process for this local
file-based publisher; multiple replicas need a shared publication coordinator.

Persist `PREDICTION_HISTORY_DB_PATH` and `PREDICTION_UPDATES_DIR` across restarts
and deployments. Defaults are `backend/data/prediction-history.sqlite` and
`backend/data/prediction-updates/`. The latter stores each latest update as one
atomically replaced JSON document, keyed to the exact baseline forecast. A
different baseline cannot accidentally inherit an old update. API requests only
read JSON; they do not fetch qualifying or load the model.

Worker logs report waiting, unchanged and published states, or the reason an
update was deferred. If an entry list changes, update and validate the model's
roster instead of inventing results for missing drivers.

## Accuracy

Qualifying supplies observed positions instead of estimates. Any improvement in
winner accuracy still needs measurement across races. Existing walk-forward
metrics use historical grid features and do not measure the improvement between
these two live forecast stages. The immutable history supports that comparison
without replacing the original prediction with hindsight.
