import type { ReactNode } from 'react'
import './speech-bubble.css'

type Speaker = 'assistant' | 'user' | 'status'

/** Balão de fala do chat/companheiro; `speaker` define lado, cor e ponta. */
export function SpeechBubble({ speaker, name, children, className = '' }: { speaker: Speaker; name?: string; children: ReactNode; className?: string }) {
  return <div className={`help-speech-bubble help-speech-bubble--${speaker}${className ? ` ${className}` : ''}`} data-speaker={speaker}>
    <div className="help-speech-bubble__panel">
      {name && <strong className="help-speech-bubble__name">{name}</strong>}
      <div className="help-speech-bubble__content">{children}</div>
    </div>
  </div>
}
