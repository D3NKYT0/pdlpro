import { BookOpen, Headphones, MessageCircle } from 'lucide-react'
import { supportTicketPrefill } from '../components/help/contextual'
import { ButtonLink } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { Denkynho } from '../components/help/Denkynho'
import { HelpCompanion } from '../components/help/HelpCompanion'
import { HelpChat } from '../components/help/HelpChat'
import { HelpPetCare } from '../components/help/HelpPetCare'
import { useHelpPageController } from '../components/help/useHelpPageController'

/** Conversa temporária com geração local e fallback explícito para a ajuda editorial. */
export function HelpPage() {
  const c = useHelpPageController()

  return (
    <div className="help-page">
      <PageHeader
        className="help-hero"
        title={c.labels.title}
        eyebrow={
          <>
            <MessageCircle aria-hidden="true" /> {c.labels.eyebrow}
          </>
        }
        description={c.labels.description}
        actions={
          <ButtonLink to={supportTicketPrefill(c.screenContext?.path, c.language)?.to ?? '/panel/support'} variant="secondary" size="sm">
            <Headphones aria-hidden="true" /> {c.labels.support}
          </ButtonLink>
        }
      />
      <div className="help-workspace">
        <HelpCompanion
          faqLink={
            <ButtonLink to="/faq" variant="secondary" size="sm">
              <BookOpen aria-hidden="true" /> {c.labels.faq}
            </ButtonLink>
          }
          onChat={c.focusChat}
          status={c.companionStatus}
          mascot={
            <Denkynho
              pose={c.pose}
              idle={c.standingSleep}
              still={c.ambientStill}
              animated={c.animated}
              appearance={c.petAppearance}
              sceneOverride={c.ambientScene}
              celebration={c.celebrating}
              dancing={c.dancing}
              talking={c.talking}
              mouthOpen={c.mouthOpen}
            />
          }
        >
          {(onActivity) => (
            <HelpPetCare
              labels={c.labels}
              language={c.language}
              userId={c.user?.id}
              pet={c.pet}
              petLoading={c.petLoading}
              petQueryError={c.petQueryError}
              petIsError={c.petIsError}
              petActionError={c.petActionError}
              petActionPending={c.petActionPending}
              busy={c.busy}
              draft={c.draft}
              failed={c.failed}
              moderationBlocked={c.moderationBlocked}
              activity={c.activity}
              careResult={c.careResult}
              emotion={c.emotion}
              animated={c.animated}
              reduced={c.reduced}
              preferences={c.preferences}
              onAnimationsChange={c.setAnimations}
              onLanguageChange={c.changeLanguage}
              onCare={c.onCare}
              onProfileChange={c.onProfileChange}
              onPreferencesPersist={c.onPreferencesPersist}
              onPreferencesApply={c.onPreferencesApply}
              onActivityReady={onActivity}
            />
          )}
        </HelpCompanion>
        <HelpChat
          labels={c.labels}
          language={c.language}
          messages={c.messages}
          limited={c.limited}
          busy={c.busy}
          draft={c.draft}
          validation={c.validation}
          topic={c.topic}
          categories={c.categories}
          suggestions={c.suggestions}
          showTopics={c.showTopics}
          screenContext={c.screenContext}
          faqLoading={c.faqLoading}
          faqError={c.faqError}
          faqEmpty={c.faqEmpty}
          actionPending={c.actionPending}
          actionFailed={c.failed}
          actionError={c.actionError}
          revealing={c.revealing}
          shown={c.shown}
          expanded={c.expanded}
          activity={c.activity}
          careResult={c.careResult}
          resources={c.resources}
          user={c.user}
          maxLength={c.maxLength}
          threadRef={c.threadRef}
          onFresh={c.freshConversation}
          onScrollFollow={c.onScrollFollow}
          onDraftChange={c.setDraft}
          onClearValidation={c.onClearValidation}
          onDraftKey={c.onDraftKey}
          onSubmit={c.submit}
          onTopicChange={c.setTopic}
          onSend={c.onSend}
          onExpand={c.onExpand}
          onRevealFinish={c.finish}
          onFaqRetry={c.onFaqRetry}
          onContextSuggest={c.onContextSuggest}
        />
      </div>
    </div>
  )
}
