export default function SnapshotDetails({ label, freshness, coverage, quality }) {
  if (!freshness) return null
  const status = { fresh: 'Recently retrieved', stale: 'Stale data', unavailable: 'Data unavailable' }[freshness.status] ?? 'Data unavailable'
  return (
    <div className="mb-4 text-xs text-[#A1A1AA]">
      <p role="status">{label}: {status}{freshness.partial ? ' · Partial data' : ''}</p>
      {freshness.status === 'stale' && <p>Using an older snapshot. Results may have changed; compare again to retry when the refresh cooldown ends.</p>}
      <details className="mt-2">
        <summary className="cursor-pointer">Data freshness and coverage · {label}</summary>
        <p className="mt-2">{freshness.retrieved_at ? `Retrieved: ${freshness.retrieved_at}. Age at lookup: ${Math.floor((freshness.age_seconds ?? 0) / 60)} minutes.` : 'No successful retrieval.'}</p>
        <p>Retrieval time is not the provider's publication time. Recently retrieved does not guarantee complete or live results.</p>
        {freshness.refresh_error && <p>Latest refresh could not provide all results. Retry cooldown: {freshness.retry_after_seconds ?? 0} seconds.</p>}
        {coverage?.expected_rounds && <p>GP rounds with records: {coverage.loaded_rounds?.length ?? 0}/{coverage.expected_rounds.length}. Missing rounds: {coverage.missing_rounds?.join(', ') || 'none'}.</p>}
        {Object.entries(quality?.drivers ?? {}).map(([code, driver]) => (
          <p key={code}>{code}: {driver.observed_rounds.length} recorded rounds, {driver.eligible_rounds.length} eligible.
            {' '}No recorded result in rounds: {driver.no_result_rounds.join(', ') || 'none'}.
          </p>
        ))}
        <p>No recorded result can mean missing data or that the driver did not enter; participation is not assumed.</p>
        {quality && <p>Selected result sources: {Object.entries(quality.selected_source_counts).map(([source, count]) => `${source} ${count}`).join(', ') || 'none'}.
          {' '}Source disagreements: {quality.conflicting_result_count}. Code-only identities: {quality.code_only_identity_count}.
        </p>}
      </details>
    </div>
  )
}
