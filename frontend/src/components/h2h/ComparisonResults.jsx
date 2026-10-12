import StatBar from './StatBar'
import SnapshotDetails from './SnapshotDetails'
import PredictionCard from './PredictionCard'

const STAT_DEFS = [
  { key: 'champ_position', label: 'Championship Position', lowerIsBetter: true  },
  { key: 'points',         label: 'Championship Points',   lowerIsBetter: false },
  { key: 'wins',           label: 'GP Wins',               lowerIsBetter: false },
  { key: 'podiums',        label: 'GP Podiums',            lowerIsBetter: false },
  { key: 'races',          label: 'GP Result Entries',     lowerIsBetter: false },
  { key: 'best_finish',    label: 'Best GP Finish',        lowerIsBetter: true  },
  { key: 'avg_finish',     label: 'Avg GP Finish',         lowerIsBetter: true  },
]

export default function ComparisonResults({ result, prediction, driver1, driver2, predictionLoading, predictionError }) {
  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#A1A1AA',
        marginBottom: '24px',
      }}>
        {result.year} Season Overview
      </div>

      {result.coverage?.missing_rounds?.length > 0 && (
        <p role="status" className="mb-6 text-sm text-[#A1A1AA]">
          Results are incomplete. Missing races: {result.coverage.missing_races?.map((race) => race.race).join(', ') || result.coverage.missing_rounds.join(', ')}.
        </p>
      )}

      <SnapshotDetails label={`${result.year} comparison`} freshness={result.freshness} coverage={result.coverage} quality={result.quality} />

      <div className="mb-6 space-y-2 text-xs text-[#A1A1AA]">
        {result.standings?.status === 'available' ? (
          <p>
            Published championship points and positions through {result.standings.through_event?.race}
            {' '}({result.standings.through_event?.date}), including sprint points and published adjustments.
          </p>
        ) : (
          <p role="status">
            Championship points and positions are unavailable
            {result.standings?.status === 'stale' ? ' because the published standings have not reached the latest due Grand Prix' : ''}.
            {' '}They are not estimated from race-only results.
          </p>
        )}
        <p>
          GP statistics use loaded Grand Prix results only, not sprints. Result entries include non-starts;
          they do not mean races completed. Wins, podiums and finishes exclude non-starts, disqualifications
          and explicitly unclassified results. Retirements count when a valid final position is published.
        </p>
        <p>
          Finish samples: {result.driver1?.abbreviation ?? driver1} {result.driver1?.finish_sample_size ?? 0}
          {' · '}{result.driver2?.abbreviation ?? driver2} {result.driver2?.finish_sample_size ?? 0}.
          {' '}Unavailable values are shown as —, not zero.
        </p>
        {[result.driver1, result.driver2].some((driver) => driver?.stats_status === 'partial') && (
          <p role="status">Some GP positions are missing. Finish averages use only the available eligible results.</p>
        )}
        {result.standings?.status === 'available' && [result.driver1, result.driver2].some((driver) => driver?.championship_status !== 'available') && (
          <p role="status">A selected driver could not be verified in the published standings; their championship values are unavailable.</p>
        )}
      </div>

      {STAT_DEFS.map((def) => (
        <StatBar
          key={def.key}
          def={def}
          d1Val={result.driver1?.[def.key]}
          d2Val={result.driver2?.[def.key]}
        />
      ))}

      {prediction?.snapshots && (
        <details className="mt-6 text-xs text-[#A1A1AA]">
          <summary className="mb-3 cursor-pointer">Prediction history data status</summary>
          {Object.entries(prediction.snapshots).map(([year, snapshot]) => (
            <SnapshotDetails key={year} label={`${year} history`} freshness={snapshot.freshness} coverage={prediction.coverage?.[year]} quality={snapshot.quality} />
          ))}
        </details>
      )}
      {prediction?.snapshots && Object.values(prediction.snapshots).some((snapshot) => snapshot.freshness?.status !== 'fresh' || snapshot.freshness?.partial) && (
        <p role="status" className="mt-3 text-xs text-[#A1A1AA]">Some prediction-history snapshots are stale, partial or unavailable. Review the data status above.</p>
      )}
      {predictionError && <p role="alert" className="mt-4 text-sm text-[#A1A1AA]">{predictionError}</p>}
      <PredictionCard
        prediction={prediction}
        d1Abbrev={driver1}
        d2Abbrev={driver2}
        loading={predictionLoading}
      />
    </div>
  )
}
