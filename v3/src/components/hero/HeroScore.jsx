export default function HeroScore({ score }) {
  return (
    <div
      className="hero-score"
      style={{ '--hero-score': score }}
      aria-label={`Índice DOCH20 ${score}`}
    >
      <div className="hero-score__ring">
        <div className="hero-score__inner">
          <strong>{score}</strong>
          <span>PREPARADO</span>
        </div>
      </div>
    </div>
  )
}
