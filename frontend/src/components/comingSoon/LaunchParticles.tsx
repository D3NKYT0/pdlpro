import { useMemo } from 'react'

/** Brasas subindo da abertura; decorativas, compartilhadas pelos estilos clássico e `memories`. */
export function LaunchParticles({ count = 68 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const band = index % 3
        const left =
          band === 0
            ? 38 + ((index * 13) % 24)
            : band === 1
              ? 28 + ((index * 17) % 44)
              : (index * 37) % 100
        return {
          id: index,
          left: `${left}%`,
          delay: `${(index % 14) * 0.4}s`,
          duration: `${6 + (index % 8)}s`,
          size: `${3 + (index % 5)}px`,
          drift: `${((index % 7) - 3) * 22}px`,
          bright: band === 0,
        }
      }),
    [count],
  )

  return (
    <div className="launch-gate__particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`launch-gate__spark${particle.bright ? ' is-bright' : ''}`}
          style={{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            ['--spark-drift' as string]: particle.drift,
          }}
        />
      ))}
    </div>
  )
}
