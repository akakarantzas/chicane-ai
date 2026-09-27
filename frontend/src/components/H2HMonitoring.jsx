import { useState } from 'react'
import { apiUrl } from '../lib/api'

const decimal = (value) => Number.isFinite(value) ? value.toFixed(3) : '—'
const percentage = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'Not yet measured'

export function ScoreExplanation({ prediction }) {
  const explanation = prediction.explanation
  if (!explanation?.components?.length) return null
  const [first, second] = explanation.driver_order ?? ['Driver 1', 'Driver 2']
  return (
    <details className="my-4 text-left text-xs text-[#A1A1AA]">
      <summary className="cursor-pointer">Why this score? · {prediction.model_version}</summary>
      <p className="mt-2">{explanation.description} Contributions add to each driver's score before rounding.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">Score contributions in selected driver order</caption>
          <thead><tr><th className="p-2">Component</th><th className="p-2">Weight</th>
            <th className="p-2">{first}</th><th className="p-2">{second}</th></tr></thead>
          <tbody>{explanation.components.map((component) => (
            <tr key={component.feature}>
              <th className="p-2 font-normal">{component.label}
                <span className="block">Inputs: {component.driver1_input ?? '—'} / {component.driver2_input ?? '—'}</span>
                {component.basis !== 'available' && <span className="block">{component.weight === 0 ? 'Not used' : 'Neutral fallback: missing evidence'}</span>}
              </th>
              <td className="p-2">{decimal(component.weight)}</td>
              <td className="p-2">{decimal(component.driver1_contribution)}</td>
              <td className="p-2">{decimal(component.driver2_contribution)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-2">Head-to-head uses shared wins; average finish and recent form favor lower positions.
        This arithmetic explains the score, not why a driver will finish ahead. Evidence safeguards can still withhold a favorite.</p>
    </details>
  )
}

export function RecordingStatus({ monitoring }) {
  if (!monitoring) return null
  let message
  if (['recorded', 'already_recorded'].includes(monitoring.status)) {
    message = `First pre-race forecast saved at ${monitoring.recorded_at}.`
    if (monitoring.matches_current === false) message += ' The current comparison differs; monitoring keeps the original forecast.'
  } else if (monitoring.status === 'disabled') message = 'Prediction tracking is disabled on this server.'
  else if (monitoring.status === 'unavailable') message = 'Prediction was not saved: tracking is unavailable.'
  else message = 'Prediction not recorded: a confirmed future race start is required.'
  return <div className="my-3 text-xs text-[#A1A1AA]" role="status">
    <p>{message}</p>
    {monitoring.settlement?.status === 'unavailable' && <p>Outcome refresh is unavailable; previous published outcomes may still be shown.</p>}
  </div>
}

export default function MonitoringPanel() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(apiUrl('/api/h2h/monitoring'))
      if (!response.ok) throw new Error('Monitoring unavailable. Try again later.')
      const data = await response.json()
      if (!['available', 'no_records', 'disabled', 'unavailable'].includes(data.status)) throw new Error('Monitoring unavailable. Try again later.')
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(err.message)
    } finally { setLoading(false) }
  }
  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-[#1A1A1F] p-6 text-sm text-[#A1A1AA]" aria-label="Prediction monitoring">
      <button className="cursor-pointer text-[#E5E7EB]" onClick={refresh} disabled={loading}>
        {loading ? 'Loading monitoring…' : report ? 'Refresh prediction monitoring' : 'Show prediction monitoring'}
      </button>
      {error && <p role="alert" className="mt-3">{error}</p>}
      {report?.status === 'disabled' && <p className="mt-3">Prediction tracking is disabled on this server.</p>}
      {report?.status === 'unavailable' && <p role="alert" className="mt-3">Monitoring storage is unavailable.</p>}
      {report?.status === 'no_records' && <p className="mt-3">No pre-race forecasts have been recorded yet. No measured accuracy is available.</p>}
      {report?.status === 'available' && <>
        <p className="mt-3">First pre-race forecasts requested on this server, including abstentions. Repeated comparisons do not replace them.</p>
        {report.groups.map((group) => <div className="mt-4" key={`${group.model_version}/${group.rule_version}/${group.policy_version}`}>
          <h3 className="font-semibold text-[#E5E7EB]">{group.model_version} · {group.policy_version}</h3>
          <p>Scoring rules: {group.rule_version}</p>
          <p>{group.overall.logged_pairs} recorded pairs · {group.scored_races} races with scored predictions</p>
          <p>Pending: {group.overall.pending_pairs} · Excluded: {group.overall.excluded_pairs} · Eligible: {group.overall.eligible_pairs}</p>
          <p>Pair accuracy: {percentage(group.overall.accuracy)} · Race-average accuracy: {percentage(group.race_macro_accuracy)}</p>
          <p>Abstentions among logged forecasts: {percentage(group.overall.abstention_rate)} · Decisions among eligible outcomes: {percentage(group.overall.decision_coverage)}</p>
          <p>Result evidence revisions: {group.result_revisions}. Last recorded outcome: {group.latest_outcome_at ?? 'none'}.</p>
          {group.trend.status === 'available'
            ? <p>Previous 5 scored races: {percentage(group.trend.previous_accuracy)} · Latest 5: {percentage(group.trend.recent_accuracy)}. Descriptive comparison, not a significance test.</p>
            : <p>Performance trend needs at least 10 races with scored predictions.</p>}
          {group.races?.length > 0 && <details className="mt-3">
            <summary className="cursor-pointer">Results by race</summary>
            <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-xs">
              <thead><tr><th className="p-2">Race</th><th className="p-2">Decided / eligible</th>
                <th className="p-2">Accuracy</th><th className="p-2">Pending / excluded</th></tr></thead>
              <tbody>{group.races.map((race) => <tr key={race.event_id}>
                <th className="p-2 font-normal">{race.date} · {race.race}</th>
                <td className="p-2">{race.decided_pairs} / {race.eligible_pairs}</td>
                <td className="p-2">{percentage(race.accuracy)}</td>
                <td className="p-2">{race.pending_pairs} / {race.excluded_pairs}</td>
              </tr>)}</tbody>
            </table></div>
          </details>}
        </div>)}
        <p className="mt-3 text-xs">Requested pairs are self-selected and correlated. These results are not calibrated confidence or a guarantee of future accuracy.
          Outcomes refresh when predictions are requested or an operator imports published results, not continuously.</p>
      </>}
    </section>
  )
}
