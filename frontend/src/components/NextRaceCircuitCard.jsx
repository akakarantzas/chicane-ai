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
    <article className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#1A1A1F] p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(232,0,45,0.14),transparent_32%),linear-gradient(135deg,rgba(255,107,53,0.08),transparent_44%)]" />
      <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-[#E8002D] via-[#FF6B35] to-transparent" />

      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)]">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#E8002D] shadow-[0_0_18px_rgba(232,0,45,0.65)]" />
            <span className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#A1A1AA]">NEXT RACE</span>
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
            <span className="rounded-md border border-[#E8002D]/25 bg-[#E8002D]/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#FF6B35]">
              {status}
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-[#A1A1AA]">
              {countryLabel}
            </span>
          </div>
        </div>

        <div className="relative rounded-lg border border-white/[0.06] bg-[#0C0C0E]/80 p-4 md:p-5">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-[0.18]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(246,215,168,0.035),transparent_58%)]" />
          <div className="relative w-full">
            <img
              src={miamiTrack}
              alt="Miami GP Circuit"
              className="block h-auto w-full opacity-80"
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
