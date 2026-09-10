import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  contentApi,
  programsApi,
  type DenkynhoAction,
  type ApiDenkynhoCareResult,
  type ApiDenkynhoProfile,
} from '../../services/api'
import { useLocation } from 'react-router-dom'
import { getHelpContext } from './contextual'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { helpArticles, type HelpArticle } from './answers'
import type { HelpChatMessage } from './HelpChat'
import { helpActivities, type HelpActivity } from './HelpPetCare'
import { useReducedMotion } from './useReducedMotion'
import { defaultDenkynhoEmotion, emotionStatus, isDenkynhoEmotion } from './emotions'
import type { HelpLanguage } from './personality'
import { isLocalDialogueMessage, respondToMessage } from './dialogue'
import { speechFrame } from './speech'
import { useAuth } from '../../contexts/AuthContext'
import { helpIdentity } from './identity'
import { moderateChatInput } from './moderation'
import { thinkingPhrase } from './thinking'
import { loadHelpPreferences, storeHelpPreferences, type HelpPreferences as Preferences } from './preferences'
import {
  advanceAmbient,
  ambientDuration,
  ambientPose,
  IDLE_TRIGGER_MS,
  startAmbient,
  type AmbientState,
} from './idleRoutine'
import { copy, dialogueWithPreferences, idempotencyKey, MAX_CHAT_MESSAGE_LENGTH, welcome } from './helpCopy'

type Message = HelpChatMessage

function resolveHelpLanguage(value: string | undefined): HelpLanguage {
  if (value === 'en' || value === 'es' || value === 'pt') return value
  return 'pt'
}

/** Orquestra estado, efeitos e handlers da página de ajuda; o JSX fica em HelpPage. */
export function useHelpPageController() {
  const { t, i18n } = useTranslation('help')
  const { user } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const identity = helpIdentity(user)
  const siteLanguage = resolveHelpLanguage(i18n.language)
  const [preferences, setPreferences] = useState<Preferences | null>(() => loadHelpPreferences(user?.id))
  const [language, setLanguage] = useState<HelpLanguage>(siteLanguage)
  const labels = useMemo(() => {
    const fallback = copy[language === 'es' ? 'en' : language]
    const page = (key: string, fallbackValue: string) => {
      const full = `page.${key}`
      const value = t(full)
      return value === full ? fallbackValue : value
    }
    return {
      title: page('title', fallback.title),
      eyebrow: page('eyebrow', fallback.eyebrow),
      description: page('description', fallback.description),
      support: page('support', fallback.support),
      companion: page('companion', fallback.companion),
      ask: page('ask', fallback.ask),
      searching: page('searching', fallback.searching),
      talking: page('talking', fallback.talking),
      idle: page('idle', fallback.idle),
      caring: page('caring', fallback.caring),
      animate: page('animate', fallback.animate),
      reduced: page('reduced', fallback.reduced),
      faq: page('faq', fallback.faq),
      chat: page('chat', fallback.chat),
      context: page('context', fallback.context),
      fresh: page('fresh', fallback.fresh),
      assistant: page('assistant', fallback.assistant),
      chatLabel: page('chatLabel', fallback.chatLabel),
      messages: page('messages', fallback.messages),
      you: page('you', fallback.you),
      full: page('full', fallback.full),
      source: page('source', fallback.source),
      related: page('related', fallback.related),
      topic: page('topic', fallback.topic),
      all: page('all', fallback.all),
      loading: page('loading', fallback.loading),
      empty: page('empty', fallback.empty),
      consulting: page('consulting', fallback.consulting),
      error: page('error', fallback.error),
      petLoading: page('petLoading', fallback.petLoading),
      petError: page('petError', fallback.petError),
      pet: page('pet', fallback.pet),
      level: page('level', fallback.level),
      xp: page('xp', fallback.xp),
      attributes: page('attributes', fallback.attributes),
      satiety: page('satiety', fallback.satiety),
      energy: page('energy', fallback.energy),
      happiness: page('happiness', fallback.happiness),
      hygiene: page('hygiene', fallback.hygiene),
      emotion: page('emotion', fallback.emotion),
      empathy: page('empathy', fallback.empathy),
      needsMood: page('needsMood', fallback.needsMood),
      reveal: page('reveal', fallback.reveal),
      message: page('message', fallback.message),
      placeholder: page('placeholder', fallback.placeholder),
      hint: page('hint', fallback.hint),
      thinking: page('thinking', fallback.thinking),
      send: page('send', fallback.send),
      invalid: page('invalid', fallback.invalid),
      blocked: page('blocked', fallback.blocked),
      language: page('language', fallback.language),
    }
  }, [language, t])
  const faq = useQuery({
    queryKey: ['help-faq', user?.id, language],
    queryFn: async () => helpArticles(await contentApi.authenticatedFaq(language)),
    retry: false,
  })
  const action = useAsyncAction()
  const petAction = useAsyncAction()
  const petQueryKey = ['denkynho-pet', user?.id] as const
  const pet = useQuery({ queryKey: petQueryKey, queryFn: contentApi.denkynho, enabled: Boolean(user), retry: false })
  const reduced = useReducedMotion()
  const [animations, setAnimations] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [welcome(identity, language, preferences)])
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
    retry: false,
    enabled: Boolean(location.search) || messages.some((message) => message.role === 'assistant' && message.text.includes('/panel')),
  })
  const screenContext = getHelpContext(
    new URLSearchParams(location.search).get('from'),
    user,
    resources.isSuccess ? resources.data : undefined,
    language,
  )
  const [dialogue, setDialogue] = useState(() => dialogueWithPreferences(language, preferences))
  const [context, setContext] = useState('')
  const [limited, setLimited] = useState(false)
  const [revealing, setRevealing] = useState<Message | null>(null)
  const [shown, setShown] = useState(0)
  const [ambient, setAmbient] = useState<AmbientState | null>(null)
  const [ambientSpeech, setAmbientSpeech] = useState(0)
  const [activity, setActivity] = useState<string | null>(null)
  const [thinkFor, setThinkFor] = useState(0)
  const [careResult, setCareResult] = useState<ApiDenkynhoCareResult | null>(null)
  const careRetry = useRef<{ action: DenkynhoAction; key: string } | null>(null)
  const ambientCareKey = useRef<string | null>(null)
  const ambientSelfCare = useRef(false)
  const [validation, setValidation] = useState('')
  const [failed, setFailed] = useState(false)
  const [moderationBlocked, setModerationBlocked] = useState(false)
  const [topic, setTopic] = useState('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const sequence = useRef(0)
  const mounted = useRef(true)
  const session = useRef(0)
  const thread = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const preferencesDirty = useRef(true)
  const hydratedPrefs = useRef(false)
  const animated = animations && !reduced
  const busy = action.pending || Boolean(revealing)

  function changeLanguage(next: HelpLanguage) {
    if (resolveHelpLanguage(i18n.language) !== next) {
      void i18n.changeLanguage(next)
    }
    setLanguage(next)
    setContext('')
    setLimited(false)
    session.current++
    setMessages([welcome(identity, next, preferences)])
    setDialogue(dialogueWithPreferences(next, preferences))
    if (preferences) {
      const updated = { ...preferences, language: next }
      setPreferences(updated)
      if (updated.remember && user?.id) storeHelpPreferences(user.id, updated)
    }
    setDraft('')
    setValidation('')
    setAmbient(null)
    setFailed(false)
    setModerationBlocked(false)
    setExpanded(new Set())
  }

  useEffect(() => {
    if (siteLanguage === language) return
    changeLanguage(siteLanguage)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to site language swings
  }, [siteLanguage])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    const felt = pet.data?.emotion
    if (!isDenkynhoEmotion(felt)) return
    const id = felt.id
    setDialogue((current) =>
      current.emotion === (id === 'calm' ? undefined : id) ? current : { ...current, emotion: id === 'calm' ? undefined : id },
    )
  }, [pet.data?.emotion])
  useEffect(() => {
    const saved = loadHelpPreferences(user?.id)
    const nextLanguage = siteLanguage
    setPreferences(saved ? { ...saved, language: nextLanguage } : saved)
    setLanguage(nextLanguage)
    session.current++
    setContext('')
    setLimited(false)
    setMessages([welcome(helpIdentity(user), nextLanguage, saved)])
    setDialogue(dialogueWithPreferences(nextLanguage, saved))
    setRevealing(null)
    setDraft('')
    setAmbient(null)
    setValidation('')
    setFailed(false)
    setModerationBlocked(false)
    setExpanded(new Set())
    setCareResult(null)
    setActivity(null)
    careRetry.current = null
    hydratedPrefs.current = false
  }, [user?.id, user?.role])
  useEffect(() => {
    const stored = pet.data?.preferences
    if (!stored || hydratedPrefs.current) return
    hydratedPrefs.current = true
    const saved = loadHelpPreferences(user?.id)
    setPreferences({
      preferred_name: stored.preferred_name || saved?.preferred_name || '',
      detail: stored.detail || saved?.detail || 'balanced',
      language: siteLanguage,
      remember: Boolean(saved?.remember || stored.preferred_name),
    })
  }, [pet.data?.preferences, user?.id, siteLanguage])
  useEffect(() => {
    if (!action.pending) {
      setThinkFor(0)
      return
    }
    const timer = setInterval(() => setThinkFor((current) => current + 2800), 2800)
    return () => clearInterval(timer)
  }, [action.pending])
  useEffect(() => {
    if (!activity) return
    const timer = setTimeout(() => setActivity(null), 8000)
    return () => clearTimeout(timer)
  }, [activity])
  useEffect(() => {
    if (busy || petAction.pending || activity || draft || ambient) return
    const timer = setTimeout(() => {
      const unlocked = (pet.data?.unlocks ?? []).filter((item) => item.slot === 'scene' && item.unlocked).map((item) => item.id)
      setAmbient(
        startAmbient({
          language,
          currentScene: pet.data?.appearance?.scene,
          unlockedScenes: unlocked,
          canDance: Boolean(pet.data?.available_actions?.includes('dance')),
          reducedMotion: !animated,
          needs: pet.data?.attributes,
          emotionId: isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion.id : undefined,
        }),
      )
      setAmbientSpeech(0)
      ambientCareKey.current = null
    }, IDLE_TRIGGER_MS)
    return () => clearTimeout(timer)
  }, [
    busy,
    petAction.pending,
    messages,
    draft,
    activity,
    ambient,
    pet.data?.appearance?.scene,
    pet.data?.unlocks,
    pet.data?.available_actions,
    pet.data?.attributes,
    pet.data?.emotion,
    language,
    animated,
  ])
  useEffect(() => {
    if (!ambient) return
    const ctx = {
      language,
      currentScene: pet.data?.appearance?.scene,
      unlockedScenes: (pet.data?.unlocks ?? []).filter((item) => item.slot === 'scene' && item.unlocked).map((item) => item.id),
      canDance: Boolean(pet.data?.available_actions?.includes('dance')),
      reducedMotion: !animated,
      needs: pet.data?.attributes,
      emotionId: isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion.id : undefined,
    }
    const timer = setTimeout(() => {
      setAmbient((current) => (current ? advanceAmbient(current, ctx) : null))
    }, ambientDuration(ambient, animated))
    return () => clearTimeout(timer)
  }, [ambient, language, animated, pet.data?.appearance?.scene, pet.data?.unlocks, pet.data?.available_actions, pet.data?.attributes, pet.data?.emotion])
  useEffect(() => {
    setAmbientSpeech(0)
  }, [ambient?.activity, ambient?.phase, ambient?.line])
  useEffect(() => {
    if (!ambient?.talking) {
      setAmbientSpeech(0)
      return
    }
    if (!animated) {
      setAmbientSpeech(Array.from(ambient.line).length)
      return
    }
    const chars = Array.from(ambient.line)
    if (ambientSpeech >= chars.length) return
    const frame = speechFrame(ambient.line, ambientSpeech, ambient.pose)
    const timer = setTimeout(() => setAmbientSpeech((count) => Math.min(chars.length, count + frame.step)), frame.delay)
    return () => clearTimeout(timer)
  }, [ambient, ambientSpeech, animated])
  useEffect(() => {
    if (!ambient?.careAction) return
    if (ambient.phase !== 'act' && ambient.phase !== 'sleep') return
    const key = `${ambient.planIndex}:${ambient.activity}:${ambient.careAction}`
    if (ambientCareKey.current === key || petAction.pending) return
    ambientCareKey.current = key
    ambientSelfCare.current = true
    const actionName = ambient.careAction
    const currentSession = session.current
    void petAction
      .run(async () => {
        const updated = await contentApi.careDenkynho(actionName, idempotencyKey())
        if (!mounted.current || currentSession !== session.current) return updated
        queryClient.setQueryData(petQueryKey, updated)
        await queryClient.invalidateQueries({ queryKey: petQueryKey })
        return updated
      })
      .then((result) => {
        ambientSelfCare.current = false
        if (result.ok && mounted.current && currentSession === session.current) setCareResult(result.value)
      })
  }, [ambient?.phase, ambient?.activity, ambient?.careAction, ambient?.planIndex, petAction, queryClient, petQueryKey])
  useEffect(() => {
    if (busy || draft) {
      setActivity(null)
      setAmbient(null)
      setAmbientSpeech(0)
      ambientCareKey.current = null
    } else if (petAction.pending && !ambientSelfCare.current) {
      setActivity(null)
      setAmbient(null)
      setAmbientSpeech(0)
      ambientCareKey.current = null
    }
  }, [busy, petAction.pending, draft])
  const finish = useCallback(() => setRevealing(null), [])
  useEffect(() => {
    if (!revealing) return
    if (!animated) {
      finish()
      return
    }
    const chars = Array.from(revealing.text)
    if (shown >= chars.length) {
      finish()
      return
    }
    const frame = speechFrame(revealing.text, shown, revealing.pose)
    const timer = setTimeout(() => setShown((count) => Math.min(chars.length, count + frame.step)), frame.delay)
    return () => clearTimeout(timer)
  }, [revealing, shown, animated, finish])
  useEffect(() => {
    const node = thread.current
    if (node && followLatest.current) node.scrollTop = node.scrollHeight
  }, [messages, revealing, shown])

  async function send(text = draft, retryId?: number) {
    const question = text.trim()
    if (!question || question.length > MAX_CHAT_MESSAGE_LENGTH) {
      setValidation(labels.invalid)
      return
    }
    if (!moderateChatInput(question).allowed) {
      setValidation(labels.blocked)
      setModerationBlocked(true)
      setAmbient(null)
      return
    }
    if (busy) return
    setValidation('')
    setAmbient(null)
    setFailed(false)
    setModerationBlocked(false)
    const currentSession = session.current
    const messageId =
      retryId ??
      messages.findLast((message) => message.role === 'user' && message.status === 'failed' && message.text === question)?.id ??
      ++sequence.current
    const result = await action.run(async () => {
      followLatest.current = true
      setDraft((current) => (current.trim() === question ? '' : current))
      setMessages((previous) =>
        previous.some((message) => message.id === messageId)
          ? previous.map((message) => (message.id === messageId ? { ...message, status: 'sending' } : message))
          : [...previous, { id: messageId, role: 'user', text: question, status: 'sending' }],
      )
      const server = await contentApi.assistantReply(
        question,
        language,
        context,
        preferences && (!context || preferencesDirty.current)
          ? { preferred_name: preferences.preferred_name, detail: preferences.detail }
          : undefined,
        screenContext?.path ?? '/panel/help',
      )
      if (
        !server ||
        !['knowledge', 'unknown', 'blocked', 'social', 'crisis'].includes(server.kind) ||
        typeof server.answer?.text !== 'string' ||
        typeof server.answer?.pose !== 'string' ||
        (server.answer.action !== undefined &&
          (server.answer.action?.url !== 'https://denky.dev.br/' || typeof server.answer.action?.label !== 'string')) ||
        (server.related_ids !== undefined && (!Array.isArray(server.related_ids) || server.related_ids.some((id) => typeof id !== 'string')))
      )
        throw new Error(labels.error)
      if (
        (server.context !== undefined && typeof server.context !== 'string') ||
        (server.mode !== undefined && !['generative', 'limited'].includes(server.mode))
      )
        throw new Error(labels.error)
      if (server.emotion !== undefined && !isDenkynhoEmotion(server.emotion)) throw new Error(labels.error)
      return {
        server,
        dialogue:
          server.kind !== 'blocked' &&
          server.kind !== 'crisis' &&
          server.mode !== 'generative' &&
          isLocalDialogueMessage(question, dialogue)
            ? respondToMessage(question, faq.data ?? [], dialogue)
            : undefined,
      }
    })
    if (!mounted.current || currentSession !== session.current) return
    if (!result.ok) {
      if (!result.skipped) {
        setFailed(true)
        setMessages((previous) => previous.map((message) => (message.id === messageId ? { ...message, status: 'failed' } : message)))
        setDraft((current) => current || question)
      }
      return
    }
    if (result.value.server?.kind === 'blocked') {
      setValidation(result.value.server.answer.text)
      setModerationBlocked(true)
      setMessages((previous) => previous.filter((message) => message.id !== messageId))
      setDraft((current) => current || question)
      return
    }
    preferencesDirty.current = false
    setContext(result.value.server.context ?? '')
    setLimited(result.value.server.mode !== 'generative')
    const felt = isDenkynhoEmotion(result.value.server.emotion) ? result.value.server.emotion : undefined
    if (felt) queryClient.setQueryData(petQueryKey, (current) => (current ? { ...current, emotion: felt } : current))
    const resolved = result.value.dialogue ?? {
      answer: {
        ...result.value.server!.answer,
        text:
          dialogue.detailPreference === 'detailed'
            ? result.value.server!.answer.details || result.value.server!.answer.text
            : result.value.server!.answer.text,
        details: dialogue.detailPreference === 'balanced' ? (result.value.server!.answer.details ?? undefined) : undefined,
        related: (result.value.server!.related_ids ?? [])
          .map((id) => faq.data?.find((item) => item.id === id))
          .filter((item): item is HelpArticle => Boolean(item)),
      },
      state: {
        ...dialogue,
        turn: dialogue.turn + 1,
        lastArticleId: result.value.server!.article_id,
        pendingChoiceIds: result.value.server!.related_ids ?? [],
        emotion: felt?.id ?? dialogue.emotion,
      },
    }
    if (felt && result.value.dialogue) resolved.state = { ...resolved.state, emotion: felt.id }
    const reply: Message = { id: ++sequence.current, role: 'assistant', ...resolved.answer }
    setDialogue(resolved.state)
    setMessages((previous) => [...previous.map((message) => (message.id === messageId ? { ...message, status: undefined } : message)), reply])
    setShown(0)
    setRevealing(animated ? reply : null)
  }

  async function careFor(item: HelpActivity, onActivity: () => void) {
    if (!pet.data || petAction.pending || busy) return
    const currentSession = session.current
    const key = careRetry.current?.action === item.action ? careRetry.current.key : idempotencyKey()
    careRetry.current = { action: item.action, key }
    const result = await petAction.run(async () => {
      const updated = await contentApi.careDenkynho(item.action as DenkynhoAction, key)
      if (!mounted.current || currentSession !== session.current) return updated
      queryClient.setQueryData(petQueryKey, updated)
      await queryClient.invalidateQueries({ queryKey: petQueryKey })
      return updated
    })
    if (!mounted.current || currentSession !== session.current || !result.ok) return
    careRetry.current = null
    setCareResult(result.value)
    setAmbient(null)
    setAmbientSpeech(0)
    ambientCareKey.current = null
    setActivity(item.pose)
    onActivity()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void send()
  }
  function onDraftKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!draft.trim() || busy) return
    void send()
  }

  const categories = Array.from(new Map((faq.data ?? []).map((item) => [item.category, item.category_label])).entries())
  const suggestions = (faq.data ?? []).filter((item) => topic === 'all' || item.category === topic).slice(0, 4)
  const last = messages[messages.length - 1]
  const emotion = isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion : defaultDenkynhoEmotion
  const emotionPose = emotion.idle_pose
  const celebrating = Boolean(activity && careResult?.level_up && !careResult.replayed)
  const pose = action.pending
    ? '03-pensando'
    : moderationBlocked
      ? '10-frustrado'
      : failed
        ? '07-triste'
        : revealing
          ? (last.pose ?? emotionPose)
          : celebrating
            ? '02-sucesso'
            : (activity ?? (ambient ? ambientPose(ambient) : last.id === 0 ? emotionPose : (last.pose ?? emotionPose)))
  const currentActivity = helpActivities.find((item) => item.pose === pose)
  const standingSleep = Boolean(ambient?.standingSleep)
  const ambientTalking = Boolean(ambient?.talking)
  const companionStatus = ambient
    ? ambient.line
    : petAction.pending
      ? labels.caring
      : action.pending
        ? thinkingPhrase(thinkFor, language)
        : revealing
          ? labels.talking
          : (currentActivity?.status[language] ?? (emotion.id !== 'calm' ? emotionStatus(emotion, language) : labels.ask))
  const ambientMouth = ambientTalking ? speechFrame(ambient!.line, ambientSpeech, ambient!.pose).mouthOpen : false
  const mouthOpen = revealing ? speechFrame(revealing.text, shown, revealing.pose).mouthOpen : ambientMouth
  const dancing = activity === '13-dancando' || Boolean(ambient?.dancing)

  function focusChat() {
    thread.current?.parentElement?.querySelector('textarea')?.focus()
  }

  function freshConversation() {
    session.current++
    setContext('')
    setLimited(false)
    setMessages([welcome(identity, language, preferences)])
    setDialogue(dialogueWithPreferences(language, preferences))
    setDraft('')
    setValidation('')
    setAmbient(null)
    setFailed(false)
    setModerationBlocked(false)
    setExpanded(new Set())
    followLatest.current = true
  }

  function onProfileChange(updated: ApiDenkynhoProfile) {
    queryClient.setQueryData(petQueryKey, updated)
  }

  async function onPreferencesPersist(next: Preferences) {
    const updated = await contentApi.updateDenkynhoPreferences({
      preferred_name: next.preferred_name,
      detail: next.detail,
    })
    queryClient.setQueryData(petQueryKey, (current) =>
      current
        ? { ...current, ...updated, preferences: updated.preferences ?? { preferred_name: next.preferred_name, detail: next.detail } }
        : updated,
    )
  }

  function onPreferencesApply(next: Preferences) {
    preferencesDirty.current = true
    setPreferences(next)
    setDialogue((current) => ({
      ...current,
      name: next.preferred_name || undefined,
      detailPreference: next.detail === 'brief' ? 'short' : next.detail,
    }))
    if (!next.preferred_name) setContext('')
  }

  function onScrollFollow(follow: boolean) {
    followLatest.current = follow
  }

  function onClearValidation() {
    setValidation('')
    setModerationBlocked(false)
  }

  function onExpand(id: number) {
    setExpanded((current) => new Set(current).add(id))
  }

  function onFaqRetry() {
    void faq.refetch()
  }

  function onContextSuggest(suggestion: string) {
    setDraft(suggestion)
    focusChat()
  }

  function onCare(item: HelpActivity, ready: () => void) {
    void careFor(item, ready)
  }

  function onSend(text: string, retryId?: number) {
    void send(text, retryId)
  }

  return {
    labels,
    language,
    screenContext,
    companionStatus,
    pose,
    standingSleep,
    ambientStill: Boolean(ambient?.still),
    animated,
    petAppearance: pet.data?.appearance,
    ambientScene: ambient?.scene,
    celebrating,
    dancing,
    talking: Boolean(revealing) || ambientTalking,
    mouthOpen,
    user,
    pet: pet.data,
    petLoading: pet.isLoading,
    petQueryError: pet.error,
    petIsError: pet.isError,
    petActionError: petAction.error,
    petActionPending: petAction.pending,
    busy,
    draft,
    failed,
    moderationBlocked,
    activity,
    careResult,
    emotion,
    reduced,
    preferences,
    messages,
    limited,
    validation,
    topic,
    categories,
    suggestions,
    showTopics: Boolean(faq.data?.length),
    faqLoading: faq.isLoading,
    faqError: faq.error,
    faqEmpty: faq.isSuccess && !faq.data.length,
    actionPending: action.pending,
    actionError: action.error,
    revealing,
    shown,
    expanded,
    resources: resources.isSuccess ? resources.data : undefined,
    maxLength: MAX_CHAT_MESSAGE_LENGTH,
    threadRef: thread,
    setAnimations,
    changeLanguage,
    onCare,
    onProfileChange,
    onPreferencesPersist,
    onPreferencesApply,
    focusChat,
    freshConversation,
    onScrollFollow,
    setDraft,
    onClearValidation,
    onDraftKey,
    submit,
    setTopic,
    onSend,
    onExpand,
    finish,
    onFaqRetry,
    onContextSuggest,
  }
}
