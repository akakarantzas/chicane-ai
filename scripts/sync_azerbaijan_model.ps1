param(
    [string]$SourceRepo = ".tmp-azerbaijan-model-repo",
    [string]$PredictionName = "azerbaijan",
    [switch]$IncludeModel
)

$ErrorActionPreference = "Stop"
if ($PredictionName -notmatch '^[a-z0-9_]+$') {
    throw "PredictionName must contain only lowercase letters, numbers and underscores."
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
if ([System.IO.Path]::IsPathRooted($SourceRepo)) {
    $sourceRoot = Resolve-Path -LiteralPath $SourceRepo
} else {
    $sourceRoot = Resolve-Path -LiteralPath (Join-Path $repoRoot $SourceRepo)
}
$targetDir = Join-Path $repoRoot "backend\app\models"

$jsonArtifacts = @(
    "${PredictionName}_predictions.json",
    "${PredictionName}_metadata.json"
)

$artifacts = [System.Collections.Generic.List[string]]::new()
foreach ($artifact in $jsonArtifacts) {
    $artifacts.Add($artifact)
}

if ($IncludeModel) {
    $artifacts.Add("${PredictionName}_model.pkl")
}

foreach ($artifact in $artifacts) {
    $source = Join-Path $sourceRoot $artifact
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing source artifact: $source"
    }
}

foreach ($artifact in $jsonArtifacts) {
    $source = Join-Path $sourceRoot $artifact
    $parsed = Get-Content -LiteralPath $source -Raw | ConvertFrom-Json

    if ($artifact -eq "${PredictionName}_predictions.json" -and $parsed.Count -eq 0) {
        throw "Prediction artifact is empty: $source"
    }

    if ($artifact -eq "${PredictionName}_metadata.json" -and -not $parsed.model_version) {
        throw "Metadata artifact is missing model_version: $source"
    }
}

$backendDir = Join-Path $repoRoot "backend"
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Create the backend virtual environment before syncing and archiving forecasts."
}

Push-Location -LiteralPath $backendDir
try {
    & $pythonExe -m app.services.prediction_history capture --predictions (Join-Path $sourceRoot "${PredictionName}_predictions.json") --metadata (Join-Path $sourceRoot "${PredictionName}_metadata.json") --export-dir (Join-Path $targetDir "forecast-archive")
    if ($LASTEXITCODE -ne 0) {
        throw "Forecast archive failed; artifacts were not replaced."
    }
} finally {
    Pop-Location
}

# Readers skip the pair while publication is in progress.
$publishLock = Join-Path $targetDir ".prediction-publish.lock"
New-Item -ItemType File -Path $publishLock -ErrorAction Stop | Out-Null
try {
    foreach ($artifact in $artifacts) {
        $source = Join-Path $sourceRoot $artifact
        $target = Join-Path $targetDir $artifact
        Copy-Item -LiteralPath $source -Destination $target -Force
        Write-Host "Synced $artifact"
    }
} finally {
    Remove-Item -LiteralPath $publishLock
}

Write-Host "$PredictionName model artifacts synced."
