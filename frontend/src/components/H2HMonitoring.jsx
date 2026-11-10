const decimal = (value) => Number.isFinite(value) ? value.toFixed(3) : '—'

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
