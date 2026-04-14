import AnimatedCircuit from './AnimatedCircuit'
import miamiTrack from '../assets/circuits/miami-track-white.png'

export default function NextRaceCircuitCard({
  raceName,
  round,
  venue,
  date,
  status,
  countryLabel,
  circuitPath,
  viewBox,
  animationDuration,
}) {
  return (
    <article className="next-race-card relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#E8002D]" />

      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)]">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#E8002D]" />
            <span className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#E8002D]">NEXT RACE</span>
          </div>

          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#E8002D]">
            {round}
          </p>
          <h2 className="mb-3 text-[32px] font-bold leading-tight text-[#F4F4F5] md:text-[36px]">
            {raceName}
          </h2>
          <p className="mb-6 text-[16px] leading-relaxed text-[#A1A1AA]">
            {venue} · {date}
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

        <div className="circuit-panel relative rounded-lg p-4 md:p-5">
          <div className="relative w-full">
            <img
              src={miamiTrack}
              alt="Miami GP Circuit"
              className="circuit-base-image block h-auto w-full"
            />
            <AnimatedCircuit
              path={circuitPath}
              viewBox={viewBox}
              duration={animationDuration}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
