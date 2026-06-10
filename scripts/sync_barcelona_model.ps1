param(
    [string]$SourceRepo = ".tmp-barcelona-catalunya-model-repo",
    [switch]$IncludeModel
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
if ([System.IO.Path]::IsPathRooted($SourceRepo)) {
    $sourceRoot = Resolve-Path -LiteralPath $SourceRepo
} else {
    $sourceRoot = Resolve-Path -LiteralPath (Join-Path $repoRoot $SourceRepo)
}
$targetDir = Join-Path $repoRoot "backend\app\models"

$jsonArtifacts = @(
    "barcelona_catalunya_predictions.json",
    "barcelona_catalunya_metadata.json"
)

$artifacts = [System.Collections.Generic.List[string]]::new()
foreach ($artifact in $jsonArtifacts) {
    $artifacts.Add($artifact)
}

if ($IncludeModel) {
    $artifacts.Add("barcelona_catalunya_model.pkl")
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

    if ($artifact -eq "barcelona_catalunya_predictions.json" -and $parsed.Count -eq 0) {
        throw "Prediction artifact is empty: $source"
    }

    if ($artifact -eq "barcelona_catalunya_metadata.json" -and -not $parsed.model_version) {
        throw "Metadata artifact is missing model_version: $source"
    }
}

foreach ($artifact in $artifacts) {
    $source = Join-Path $sourceRoot $artifact
    $target = Join-Path $targetDir $artifact
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Host "Synced $artifact"
}

Write-Host "Barcelona-Catalunya model artifacts synced."
