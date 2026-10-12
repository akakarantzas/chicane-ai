import { ScoreExplanation, RecordingStatus } from '../H2HMonitoring'
import { D1_COLOR, D2_SECONDARY, HEADING_TEXT_COLOR } from './theme'

function UncertaintyDetails({ prediction, d1Abbrev, d2Abbrev }) {
  const evidence = prediction.uncertainty
  return (
    <div className="my-3 text-xs text-[#A1A1AA]">
      <p>Calibrated confidence unavailable. Heuristic scores are not probabilities.</p>
      {evidence && <>
        <p className="mt-2">Eligible history: {d1Abbrev} {evidence.driver1_eligible_races ?? '—'} races;
          {' '}{d2Abbrev} {evidence.driver2_eligible_races ?? '—'} races; {evidence.shared_races ?? '—'} shared.</p>
        <p className="mt-1">A favorite requires at least {evidence.minimum_eligible_races} eligible races per driver,
          {' '}known chronology and a score gap of at least {evidence.minimum_score_margin}.
          These safeguards do not guarantee accuracy.</p>
        {evidence.data_warnings?.map((warning) => <p role="status" className="mt-2" key={warning}>{warning}</p>)}
      </>}
    </div>
  )
}

export default function PredictionCard({ prediction, d1Abbrev, d2Abbrev, loading }) {
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1A1A1F',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '16px',
        border: '1px solid var(--red-border)',
        boxShadow: `0 0 18px rgba(225,6,0,0.045)`,
        textAlign: 'center',
        color: '#A1A1AA',
        fontSize: '14px',
      }}>
        Generating prediction...
      </div>
    )
  }

  if (!prediction) return null

  const historyYears = prediction.history_scope?.years ?? []
  const historyLabel = historyYears.length ? historyYears.join(', ') : 'Available seasons'
  const predictionTitle = `${prediction.next_race ?? 'Next Grand Prix'} · Finish-ahead prediction`
  const unavailableLabels = {
    insufficient_data: 'Insufficient data',
    insufficient_evidence: 'Insufficient evidence',
    data_unavailable: 'Prediction withheld: incomplete data',
    no_clear_favorite: 'No clear favorite',
    no_upcoming_race: 'No upcoming Grand Prix',
    schedule_time_unknown: 'Race start time unconfirmed',
  }
  const winnerAbbrev = prediction.predicted_winner?.toUpperCase()
  if (prediction.prediction_status !== 'available' || ![d1Abbrev.toUpperCase(), d2Abbrev.toUpperCase()].includes(winnerAbbrev)) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-[#1A1A1F] p-6 text-center">
        <p className="text-xs text-[#A1A1AA]">{predictionTitle}</p>
        <p className="mt-3 text-lg font-semibold text-[#E5E7EB]">
          {unavailableLabels[prediction.prediction_status] ?? 'Prediction unavailable'}
        </p>
        <p className="mt-2 text-sm text-[#A1A1AA]">{prediction.reasoning}</p>
        <UncertaintyDetails prediction={prediction} d1Abbrev={d1Abbrev} d2Abbrev={d2Abbrev} />
        <ScoreExplanation prediction={prediction} />
        <RecordingStatus monitoring={prediction.monitoring} />
      </div>
    )
  }

  const d2IsWinner = winnerAbbrev === d2Abbrev.toUpperCase()
  const winnerColor  = winnerAbbrev === d1Abbrev.toUpperCase() ? D1_COLOR : D2_SECONDARY
  const score = d2IsWinner ? prediction.driver2_score : prediction.driver1_score
  const hasScore = prediction.score_type === 'uncalibrated_heuristic' && Number.isFinite(score) && score >= 0 && score <= 1

  const d1Wins = prediction.h2h_record?.driver1_wins ?? 0
  const d2Wins = prediction.h2h_record?.driver2_wins ?? 0
  const d1IsWinner = winnerAbbrev === d1Abbrev.toUpperCase()

  return (
    <div style={{
      backgroundColor: '#1A1A1F',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '16px',
      border: '1px solid var(--red-border)',
      boxShadow: `0 0 18px rgba(225,6,0,0.045)`,
      textAlign: 'center',
    }}>
      {/* Top label */}
      <div style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#A1A1AA',
        marginBottom: '8px',
      }}>
        {predictionTitle}
      </div>

      <p className="mb-3 text-sm text-[#A1A1AA]">Which driver finishes ahead, regardless of who wins the race?</p>

      {/* Winner name */}
      <div style={{
        fontSize: '28px',
        fontWeight: 800,
        color: winnerColor,
        textShadow: d2IsWinner ? `0 0 5px rgba(244,250,255,.18), 0 0 10px rgba(127,228,255,.1)` : 'none',
        lineHeight: 1.1,
        marginBottom: '12px',
      }}>
        {prediction.predicted_winner_full_name}
      </div>

      {/* H2H score */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <span className="num" style={{
          fontSize: '36px',
          fontWeight: 800,
          color: d1IsWinner ? D1_COLOR : '#52525B',
        }}>{d1Wins}</span>
        <span style={{ fontSize: '24px', color: '#A1A1AA', fontWeight: 400 }}>—</span>
        <span className="num" style={{
          fontSize: '36px',
          fontWeight: 800,
          color: !d1IsWinner ? D2_SECONDARY : '#52525B',
          textShadow: !d1IsWinner ? `0 0 9px rgba(244,250,255,.3), 0 0 18px rgba(127,228,255,.2)` : 'none',
        }}>{d2Wins}</span>
      </div>

      {/* Historical record scope and scoring rules */}
      <p className="mb-4 text-xs text-[#A1A1AA]">
        Historical head-to-head · {historyLabel} · {prediction.h2h_record?.total_races ?? 0} scored Grands Prix
      </p>
      {prediction.recent_form && (
        <details className="mb-4 text-left text-xs text-[#A1A1AA]">
          <summary className="cursor-pointer">Recent form: last {prediction.recent_form.window_size} eligible Grands Prix per driver</summary>
          <p className="mt-2 leading-relaxed">
            Oldest to newest, using available eligible results before the target race. Windows may include prior seasons
            and different races for each driver. Missing races are not filled in; fewer results mean a smaller sample.
          </p>
          {[[d1Abbrev, prediction.recent_form.driver1], [d2Abbrev, prediction.recent_form.driver2]].map(([code, form]) => (
            <div key={code} className="mt-2">
              <p>{code}: {form?.sample_size ?? 0}/{prediction.recent_form.window_size} results · Average finish {form?.average_finish ?? '—'}</p>
              {form?.status === 'chronology_unavailable' ? (
                <p>Recent form unavailable: race chronology could not be verified.</p>
              ) : (
                <p>{form?.races?.map((race) => `${race.year} ${race.race} (${race.date ?? `round ${race.round}`}) P${race.position}`).join(' → ') || 'No eligible results.'}</p>
              )}
            </div>
          ))}
          {!prediction.recent_form.used_in_score && (
            <p className="mt-2">Recent form is not used in this score because it is unavailable for one or both drivers.</p>
          )}
        </details>
      )}
      <details className="mb-4 text-left text-xs text-[#A1A1AA]">
        <summary className="cursor-pointer">How this comparison is scored</summary>
        <p className="mt-2 leading-relaxed">
          The lower published final position finishes ahead. Retirements count when a valid final position is available.
          Non-starts, disqualifications, explicitly unclassified results, and missing positions are excluded.
          Equal positions award neither driver a win. Sprints are not included in this record.
        </p>
        <p className="mt-2">
          Excluded races: {prediction.h2h_record?.excluded_races ?? 0}. Equal-position races: {prediction.h2h_record?.tied_races ?? 0}.
          The season overview above is separate from this historical record.
        </p>
      </details>
      <UncertaintyDetails prediction={prediction} d1Abbrev={d1Abbrev} d2Abbrev={d2Abbrev} />
      <ScoreExplanation prediction={prediction} />
      <RecordingStatus monitoring={prediction.monitoring} />
      {/* Raw heuristic strength, never presented as probability or confidence. */}
      {hasScore && <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#A1A1AA',
          marginBottom: '6px',
        }}>
          Heuristic score (not probability)
        </div>
        <div style={{
          height: '6px',
          borderRadius: '99px',
          backgroundColor: '#27272A',
          overflow: 'visible',
        }}>
          <div
            className={`h2h-confidence-bar-fill ${d2IsWinner ? 'h2h-confidence-bar-fill-hologram' : ''}`}
            style={{ '--bar-width': `${score * 100}%` }}
          />
        </div>
        <div className="num" style={{
          fontSize: '14px',
          fontWeight: 600,
          color: HEADING_TEXT_COLOR,
          marginTop: '6px',
        }}>
          {score.toFixed(2)} / 1
        </div>
      </div>}

      {/* Reasoning */}
      {prediction.reasoning && (
        <div style={{
          fontSize: '13px',
          color: '#A1A1AA',
          fontStyle: 'italic',
          marginTop: '12px',
          lineHeight: 1.5,
        }}>
          {prediction.reasoning}
        </div>
      )}
    </div>
  )
}
