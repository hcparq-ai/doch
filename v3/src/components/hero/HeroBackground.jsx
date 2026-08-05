import { Flag } from 'lucide-react'

export default function HeroBackground() {
  return (
    <div className="hero-background" aria-hidden="true">
      <div className="hero-glow" />

      <div className="hero-fog hero-fog--one" />
      <div className="hero-fog hero-fog--two" />

      <div className="hero-mountain hero-mountain--back" />
      <div className="hero-mountain hero-mountain--middle" />
      <div className="hero-mountain hero-mountain--front" />

      <svg
        className="hero-route"
        viewBox="0 0 430 420"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M20 404
             C68 380 103 360 132 328
             C162 295 158 268 197 243
             C237 217 275 230 292 188
             C308 148 286 120 325 91
             C353 70 377 49 408 13"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx="132" cy="328" r="5" fill="currentColor" />
        <circle cx="292" cy="188" r="5" fill="currentColor" />
      </svg>

      <Flag
        className="hero-route-flag"
        size={27}
        strokeWidth={2}
      />
    </div>
  )
}
