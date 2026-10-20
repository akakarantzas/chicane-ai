import { memo } from 'react'
import AnimatedCircuit from './AnimatedCircuit'
import { circuits } from '../data/circuits'

function normalizeRaceName(name = '') {
  return name
    .replace(/\bGrand Prix\b/gi, 'GP')
    .trim()
    .toLowerCase()
}

function getPredictionStatus(raceName, prediction, loading) {
  const hasMatchingRaceName =
    normalizeRaceName(prediction?.race) === normalizeRaceName(raceName)

  if (hasMatchingRaceName && prediction?.status) {
    return prediction.status
  }

  return loading ? 'Loading predictions' : 'Predictions pending'
}

function getViewportStyle(viewBox, trim, useImageOverlay) {
  if (!useImageOverlay) return undefined

  const [, , width, height] = (viewBox ?? '').split(/\s+/).map(Number)
  if (!(width > 0 && height > 0)) return undefined

  const style = { aspectRatio: `${width} / ${height}` }

  if (trim) {
    // Vertical percentage margins scale with width, matching the image scale.
    style.marginTop = `${(-100 * trim.top) / width}%`
    style.marginBottom = `${(-100 * trim.bottom) / width}%`
  }

  return style
}

const CircuitPanel = memo(function CircuitPanel({ circuit, raceName }) {
  const {
    image,
    path,
    viewBox,
    duration,
    renderMode,
    imageVerticalTrim,
  } = circuit ?? {}

  const useImageOverlay = renderMode === 'image-overlay'
  const showImage = useImageOverlay || !path
  const viewportStyle = getViewportStyle(viewBox, imageVerticalTrim, useImageOverlay)

  return (
    <div className="circuit-panel relative rounded-lg p-4 md:p-5">
      <div
        className={`circuit-viewport relative w-full ${useImageOverlay ? 'circuit-viewport-image-ratio' : ''}`}
        style={viewportStyle}
      >
        {image && (
          <img
            src={image}
            alt={`${raceName} Circuit`}
            className={`circuit-base-image ${showImage ? 'circuit-base-image-visible circuit-track-image-aligned' : ''}`}
          />
        )}
        {path && viewBox && (
          <AnimatedCircuit
            ariaLabel={`Animated ${raceName} circuit marker`}
            path={path}
            viewBox={viewBox}
            duration={duration}
            showPath={!useImageOverlay}
            showDebugPath={false}
            pathVariant="glow"
            preserveAspectRatio={useImageOverlay ? 'xMidYMid meet' : 'none'}
            className={useImageOverlay ? 'circuit-overlay-image-aligned' : ''}
          />
        )}
      </div>
    </div>
  )
})

export default function NextRaceCircuitCard({
  race,
  prediction,
  predictionLoading = false,
}) {
  const circuit = circuits[race.circuitId]
  const raceName = race.name.replace(/\bGP\b/g, 'Grand Prix')
  const year = new Date(race.raceAt).getUTCFullYear()
  const venue = race.venue ?? circuit?.name ?? 'Race weekend'
  const countryLabel = `${race.city ?? race.country} · ${race.code}`
  const status = getPredictionStatus(race.name, prediction, predictionLoading)
  const eventKey = `${race.raceAt}:${race.circuitId}`

  return (
    <article aria-label="Next race" className="next-race-card relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#E8002D]" />

      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)]">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#E8002D]" />
            <span className="text-[13px] font-medium uppercase tracking-widest text-[#E8002D]">NEXT RACE</span>
          </div>

          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#E8002D]">
            Round {race.round} · {year} Season
          </p>
          <h2 className="mb-3 text-[32px] font-bold leading-tight text-[#F4F4F5] md:text-[36px]">
            {raceName}
          </h2>
          <p className="mb-6 text-[16px] leading-relaxed text-[#A1A1AA]">
            {venue} · {race.date}, {year}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="next-race-pill-primary rounded-md px-3.5 py-1.5 text-[13px] font-semibold">
              {status}
            </span>
            <span className="next-race-pill-secondary rounded-md px-3.5 py-1.5 text-[13px]">
              {countryLabel}
            </span>
          </div>
        </div>

        {/* Changing events unmounts the old panel and cancels its animation. */}
        <CircuitPanel key={eventKey} circuit={circuit} raceName={raceName} />
      </div>
    </article>
  )
}
