import type { FormEvent, KeyboardEvent, RefObject } from 'react'
import { Send } from 'lucide-react'
import type { ApiDenkynhoCareResult } from '../../services/api'
import { Button, ButtonLink, ExternalButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { EmptyState, ErrorNotice, LoadingState } from '../ui/Feedback'
import { Select } from '../ui/Select'
import { SpeechBubble } from './SpeechBubble'
import { getHelpActionsForText, type HelpContext, type HelpIdentity, type HelpResources } from './contextual'
import type { HelpArticle } from './answers'
import type { HelpLanguage } from './personality'

export type HelpChatMessage = {
  id: number
  role: 'user' | 'assistant'
  text: string
  status?: 'sending' | 'failed'
  details?: string
  followUp?: string
  source?: string
  related?: HelpArticle[]
  pose?: string
  action?: { label: string; url: string }
}

export type HelpChatLabels = {
  chat: string
  context: string
  fresh: string
  chatLabel: string
  messages: string
  you: string
  full: string
  source: string
  related: string
  topic: string
  all: string
  loading: string
  empty: string
  consulting: string
  error: string
  reveal: string
  message: string
  placeholder: string
  hint: string
  thinking: string
  send: string
}

interface HelpChatProps {
  labels: HelpChatLabels
  language: HelpLanguage
  messages: HelpChatMessage[]
  limited: boolean
  busy: boolean
  draft: string
  validation: string
  topic: string
  categories: Array<[string, string]>
  suggestions: HelpArticle[]
  showTopics: boolean
  screenContext?: HelpContext | null
  faqLoading: boolean
  faqError: unknown
  faqEmpty: boolean
  actionPending: boolean
  actionFailed: boolean
  actionError: unknown
  revealing: HelpChatMessage | null
  shown: number
  expanded: Set<number>
  activity: string | null
  careResult: ApiDenkynhoCareResult | null
  resources?: HelpResources
  user: HelpIdentity
  maxLength: number
  threadRef: RefObject<HTMLDivElement | null>
  onFresh: () => void
  onScrollFollow: (follow: boolean) => void
  onDraftChange: (value: string) => void
  onClearValidation: () => void
  onDraftKey: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: (event: FormEvent) => void
  onTopicChange: (value: string) => void
  onSend: (text: string, retryId?: number) => void
  onExpand: (id: number) => void
  onRevealFinish: () => void
  onFaqRetry: () => void
  onContextSuggest: (suggestion: string) => void
}

export function HelpChat({
  labels,
  language,
  messages,
  limited,
  busy,
  draft,
  validation,
  topic,
  categories,
  suggestions,
  showTopics,
  screenContext,
  faqLoading,
  faqError,
  faqEmpty,
  actionPending,
  actionFailed,
  actionError,
  revealing,
  shown,
  expanded,
  activity,
  careResult,
  resources,
  user,
  maxLength,
  threadRef,
  onFresh,
  onScrollFollow,
  onDraftChange,
  onClearValidation,
  onDraftKey,
  onSubmit,
  onTopicChange,
  onSend,
  onExpand,
  onRevealFinish,
  onFaqRetry,
  onContextSuggest,
}: HelpChatProps) {
  return (
    <Card as="section" className="help-chat" aria-label={labels.chatLabel}>
      <header className="help-chat-head">
        <div>
          <h2>{labels.chat}</h2>
          <p className="muted">{labels.context}</p>
          {limited && (
            <p role="status">
              {language === 'pt'
                ? 'Estou no modo de ajuda básica. A conversa com IA está indisponível no momento.'
                : 'Basic help mode is active. AI conversation is currently unavailable.'}
            </p>
          )}
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={onFresh}>
          {labels.fresh}
        </Button>
      </header>
      <div
        className="help-messages"
        ref={threadRef}
        onScroll={(event) => {
          const node = event.currentTarget
          onScrollFollow(node.scrollHeight - node.scrollTop - node.clientHeight < 64)
        }}
        role="log"
        aria-label={labels.messages}
        aria-live="polite"
        aria-relevant="additions"
      >
        {screenContext && messages.length === 1 && (
          <section className="help-context">
            <strong>{screenContext.title}</strong>
            <p>{screenContext.tip}</p>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onContextSuggest(screenContext.suggestion)}>
              {screenContext.suggestion}
            </Button>
            <div className="help-activities">
              {screenContext.actions.map((item) => (
                <ButtonLink key={item.to} size="sm" variant="secondary" to={item.to}>
                  {item.label}
                </ButtonLink>
              ))}
            </div>
          </section>
        )}
        {messages.map((message) => {
          const assistant = message.role === 'assistant'
          const revealingThis = revealing?.id === message.id
          return (
            <article key={message.id} className={`help-message from-${message.role}`}>
              <SpeechBubble
                speaker={assistant ? 'assistant' : 'user'}
                name={assistant ? 'Denkynho' : labels.you}
                className={revealingThis ? 'is-revealing' : undefined}
              >
                {revealingThis ? (
                  <>
                    <p aria-hidden="true">{Array.from(message.text).slice(0, shown).join('') || '…'}</p>
                    <p className="help-sr">{message.text}</p>
                  </>
                ) : (
                  <p>{message.text}</p>
                )}
                {message.status === 'failed' && (
                  <div className="help-message-retry">
                    <small>{language === 'pt' ? 'Não foi possível responder.' : 'Could not get a reply.'}</small>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onSend(message.text, message.id)}>
                      {language === 'pt' ? 'Reenviar mensagem' : 'Retry message'}
                    </Button>
                  </div>
                )}
                {message.details && (
                  <Button size="sm" variant="secondary" onClick={() => onExpand(message.id)} disabled={expanded.has(message.id)}>
                    {labels.full}
                  </Button>
                )}
                {message.details && expanded.has(message.id) && <p className="help-details">{message.details}</p>}
                {message.followUp && <p className="help-follow-up">{message.followUp}</p>}
                {message.action && message.id !== revealing?.id && (
                  <div className="help-activities">
                    <ExternalButtonLink href={message.action.url} size="sm" variant="secondary">
                      {message.action.label}
                    </ExternalButtonLink>
                  </div>
                )}
                {assistant && message.id !== revealing?.id && (
                  <div className="help-activities">
                    {getHelpActionsForText(`${message.text} ${message.details ?? ''}`, user, resources, language).map((item) => (
                      <ButtonLink key={item.to} size="sm" variant="secondary" to={item.to}>
                        {item.label}
                      </ButtonLink>
                    ))}
                  </div>
                )}
                {message.source && (
                  <small className="muted">
                    {labels.source}: {message.source}
                  </small>
                )}
                {message.related?.length ? (
                  <div className="help-related" aria-label={labels.related}>
                    <small className="muted">{labels.related}</small>
                    {message.related.map((item) => (
                      <Button key={item.id} size="sm" variant="secondary" disabled={busy} onClick={() => void onSend(item.question)}>
                        {item.question}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </SpeechBubble>
            </article>
          )
        })}
        {messages.length === 1 && showTopics && (
          <div className="help-topic">
            <Field label={labels.topic}>
              <Select
                value={topic}
                onChange={onTopicChange}
                options={[{ value: 'all', label: labels.all }, ...categories.map(([value, label]) => ({ value, label }))]}
              />
            </Field>
          </div>
        )}
        {messages.length === 1 && suggestions.length > 0 && (
          <div className="help-suggestions" aria-label="Perguntas sugeridas">
            {suggestions.map((item) => (
              <Button key={item.id} variant="secondary" size="sm" disabled={busy} onClick={() => void onSend(item.question)}>
                {item.question}
                {item.audience && item.audience !== 'public' ? ` · ${item.audience_label}` : ''}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="help-chat-status">
        {activity && careResult && !careResult.replayed && (
          <p role="status" className="denk-care-gains">
            {language === 'pt'
              ? ['Que boa pausa!', 'Adorei esse cuidado!', 'Pronto para continuar!'][careResult.experience % 3]
              : ['That was a good break!', 'Thanks for the care!', 'Ready to carry on!'][careResult.experience % 3]}{' '}
            +{careResult.xp_gained} XP
            {careResult.level_up
              ? language === 'pt'
                ? ` · Cheguei ao nível ${careResult.level}!`
                : ` · I reached level ${careResult.level}!`
              : ''}
          </p>
        )}
        {faqLoading && <LoadingState>{labels.loading}</LoadingState>}
        <ErrorNotice error={faqError} onRetry={onFaqRetry} />
        {faqEmpty && <EmptyState>{labels.empty}</EmptyState>}
        {actionPending && <LoadingState>{labels.consulting}</LoadingState>}
        <ErrorNotice error={actionFailed && actionError} fallback={labels.error} />
        {revealing && (
          <div className="help-reveal">
            <Button size="sm" variant="secondary" onClick={onRevealFinish}>
              {labels.reveal}
            </Button>
          </div>
        )}
      </div>
      <form className="help-compose" onSubmit={onSubmit}>
        <Field
          className="help-compose-field"
          label={<span className="help-compose-label">{labels.message}</span>}
          error={validation && <span id="help-validation">{validation}</span>}
        >
          <textarea
            value={draft}
            onChange={(event) => {
              onDraftChange(event.target.value)
              if (validation) onClearValidation()
            }}
            onKeyDown={onDraftKey}
            maxLength={maxLength}
            rows={2}
            placeholder={
              busy
                ? language === 'pt'
                  ? 'Você já pode escrever a próxima mensagem…'
                  : 'You can draft your next message…'
                : labels.placeholder
            }
            enterKeyHint="send"
            aria-invalid={Boolean(validation)}
            aria-describedby={validation ? 'help-validation' : undefined}
          />
        </Field>
        <div className="help-compose-actions">
          <small className="muted help-compose-hint">{labels.hint}</small>
          <Button type="submit" size="sm" busy={actionPending} busyLabel={labels.thinking} disabled={busy || !draft.trim() || faqLoading}>
            <Send aria-hidden="true" /> <span className="help-compose-send-label">{labels.send}</span>
          </Button>
        </div>
      </form>
    </Card>
  )
}
