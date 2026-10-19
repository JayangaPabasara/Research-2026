import { uiText } from '@/i18n/text'
import { useTranslation } from 'react-i18next'
import { findTaxonomyTopic } from '@/lib/taxonomy'
import { isExpiredChatSession } from '@/lib/chatRecovery'
import type { TreatmentHandoff } from '@/lib/treatmentHandoff'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { useLocation, useNavigate } from 'react-router-dom'

import {
  Clock,
  MessageCircle,
  Play,
  RotateCcw,
  Sprout,
  Volume2,
  VolumeX,
} from 'lucide-react'

import toast from 'react-hot-toast'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

import ChatBubble from '@/components/chat/ChatBubble'
import ChatComposer from '@/components/chat/ChatComposer'
import TopicChips from '@/components/chat/TopicChips'
import TypingIndicator from '@/components/chat/TypingIndicator'

import {
  sendChatMessage,
  getChatTopics,
  getChatTaxonomy,
  type TaxonomyTopic,
} from '@/lib/chatApi'

import { stripLiteMarkdown } from '@/lib/markdownLite'

import {
  useChatStore,
  type ArchivedChat,
} from '@/store/chatStore'

import { useAuthStore } from '@/store/authStore'

import {
  useSpeechRecognition,
} from '@/hooks/useSpeechRecognition'

import type {
  MicLang,
} from '@/hooks/useSpeechRecognition'

import {
  useSpeechSynthesis,
} from '@/hooks/useSpeechSynthesis'

import { formatDate, formatInitialAdvisorMessage } from '@/lib/disease'

type Tab = 'chat' | 'history'

type SpeechLanguage = 'en' | 'si'

const EMPTY_HISTORY: ArchivedChat[] = []

function normalizeSpeechLanguage(
  language: unknown
): SpeechLanguage {
  if (
    language === 'si' ||
    language === 'si-LK'
  ) {
    return 'si'
  }

  return 'en'
}

function chatPreview(
  messages: {
    role: 'user' | 'assistant'
    content: string
  }[]
): string {
  const firstUserMessage =
    messages.find(
      (message) =>
        message.role === 'user'
    )

  return (
    firstUserMessage?.content ||
    'Conversation'
  )
}

export default function TreatmentChat() {
  const { t, i18n } = useTranslation()
  const [conversationLang, setConversationLang] = useState<'si' | 'en'>(() => i18n.language === 'en' ? 'en' : 'si')
  const [taxonomy, setTaxonomy] = useState<TaxonomyTopic[]>([])
  const [, setRestored] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const pendingSessions = useChatStore(state => state.pendingSessions)
  /*
   * ==================================================
   * AUTH
   * ==================================================
   */

  const user = useAuthStore(
    (state) => state.user
  )

  const userId =
    user?.id || 'guest'

  /*
   * ==================================================
   * NAVIGATION
   *
   * Leaf/Pest result pages can deep-link here with an
   * initial message to auto-send (e.g. "Bacterial Blight"
   * from the "Ask Treatment Advisor" button), passed via
   * router state: navigate('/chat', { state: { initialMessage } }).
   * ==================================================
   */

  const location = useLocation()
  const navigate = useNavigate()

  /*
   * ==================================================
   * CHAT STORE
   * ==================================================
   */

  const session = useChatStore(
    (state) =>
      state.sessions[userId]
  )

  const startNewSession =
    useChatStore(
      (state) =>
        state.startNewSession
    )

  const addMessage =
    useChatStore(
      (state) =>
        state.addMessage
    )

  const resetSession =
    useChatStore(
      (state) =>
        state.resetSession
    )

  const continueSession =
    useChatStore(
      (state) =>
        state.continueSession
    )

  const archivedChats =
    useChatStore(
      (state) =>
        state.history[userId] ??
        EMPTY_HISTORY
    )

  /*
   * ==================================================
   * LOCAL STATE
   * ==================================================
   */

  const [tab, setTab] =
    useState<Tab>('chat')

  const [
    selectedChat,
    setSelectedChat,
  ] =
    useState<ArchivedChat | null>(
      null
    )

  const [input, setInput] =
    useState('')

  const [sendingLocal, setSending] =
    useState(false)
  const sending = sendingLocal || Boolean(session && pendingSessions.includes(session.sessionId))

  const [topics, setTopics] =
    useState<string[]>([])

  const [
    confirmReset,
    setConfirmReset,
  ] =
    useState(false)

  const [
    resetting,
    setResetting,
  ] =
    useState(false)

  const [micLang, setMicLang] =
    useState<MicLang>(() => i18n.language === 'en' ? 'en-US' : 'si-LK')

  const [
    autoSpeak,
    setAutoSpeak,
  ] =
    useState(false)

  /*
   * ==================================================
   * REFS
   * ==================================================
   */

  const scrollRef =
    useRef<HTMLDivElement>(null)

  const autoSpeakRef =
    useRef(autoSpeak)

  const warnedNoSinhalaVoiceRef =
    useRef(false)

  /*
   * Prevent duplicate initialization.
   *
   * React StrictMode can execute effects twice
   * during development.
   */

  const initializedUserRef =
    useRef<string | null>(null)

  autoSpeakRef.current =
    autoSpeak

  /*
   * ==================================================
   * SPEECH SYNTHESIS
   * ==================================================
   */

  const tts =
    useSpeechSynthesis()

  /*
   * ==================================================
   * SPEECH RECOGNITION
   * ==================================================
   */

  const handleSpeechResult =
    useCallback(
      (finalText: string) => {
        setInput(
          (previous) =>
            previous
              ? `${previous} ${finalText}`
              : finalText
        )
      },
      []
    )

  const recognition =
    useSpeechRecognition(
      handleSpeechResult
    )

  /*
   * ==================================================
   * SEND MESSAGE
   *
   * Declared before the init effect below (function
   * declarations are hoisted) so a deep-linked initial
   * message can be sent as soon as the fresh session is
   * ready.
   * ==================================================
   */

  async function handleSend(
    text?: string,
    newHandoff = false
  ): Promise<void> {
    const content = (
      text ?? input
    ).trim()

    if (
      !content
    ) {
      return
    }

    /*
     * Always retrieve the latest session.
     *
     * This is important after clicking Continue,
     * because the sessionId may have changed.
     */

    const currentSession =
      useChatStore
        .getState()
        .sessions[userId]

    if (!currentSession || (sessionExpired && !newHandoff)) {
      toast.error(
        uiText("Chat session is not ready. Please try again.")
      )

      return
    }

    if (!useChatStore.getState().beginRequest(currentSession.sessionId)) return
    const requestIsCurrent = () => useChatStore.getState().sessions[userId]?.sessionId === currentSession.sessionId

    /*
     * Stop microphone.
     */

    if (
      recognition.listening
    ) {
      recognition.stop()
    }

    /*
     * Stop current TTS.
     */

    tts.stop()

    /*
     * Save user message locally.
     */

    addMessage(userId, {
      role: 'user',
      content,
    })

    setInput('')
    setSending(true)
    setSendError(null)

    try {
      /*
       * Send using current session ID.
       *
       * For a restored History conversation this is
       * the ORIGINAL session ID.
       */

      const response =
        await sendChatMessage(
          content,
          currentSession.sessionId
        )

      if (!requestIsCurrent()) return
      const language =
        normalizeSpeechLanguage(
          response.language
        )

      /*
       * Save assistant response.
       */

      const assistantMessage =
        addMessage(userId, {
          role: 'assistant',
          content:
            response.reply,
          language,
          inScope:
            response.in_scope,
          chemicals:
            response.chemicals,
          followUpQuestion:
            response.follow_up_question,
        })

      /*
       * Automatically read assistant response
       * when enabled.
       */

      if (
        autoSpeakRef.current
      ) {
        speakMessage(
          assistantMessage.id,
          stripLiteMarkdown(
            response.reply
          ),
          language
        )
      }
    } catch (
      error: unknown
    ) {
      if (!requestIsCurrent()) return
      if (isExpiredChatSession(error)) {
        setSessionExpired(true)
        useChatStore.getState().updateSessionPreferences(userId, { contextUnavailable: true })
        toast.error(t('expiredChatHelp'))
        return
      }
      let errorMessage = t('chatFailed')

      /*
       * Read API error detail.
       */

      if (
        typeof error ===
          'object' &&
        error !== null &&
        'response' in error
      ) {
        const responseError =
          error as {
            response?: {
              data?: {
                detail?: unknown
              }
            }
          }

        const detail =
          responseError
            .response?.data
            ?.detail

        if (
          typeof detail ===
          'string'
        ) {
          errorMessage =
            detail
        }
      }

      toast.error(
        errorMessage
      )
      setSendError(errorMessage)

      // Keep received advice unchanged. Errors are UI state, not fabricated replies.
    } finally {
      useChatStore.getState().endRequest(currentSession.sessionId)
      setSending(false)
    }
  }

  /*
   * ==================================================
   * RESTORE CHAT OR HANDLE A NEW DETECTION
   *
   * Restore the active local session on ordinary navigation.
   * A new intentional detection handoff starts a fresh session.
   *
   * If a deep link brought an initialMessage (e.g. from
   * the Leaf/Pest "Ask Treatment Advisor" button), send
   * it immediately in this fresh session, then clear the
   * router state so refreshing/revisiting doesn't resend.
   * ==================================================
   */

  useEffect(() => {
    const store = useChatStore.getState()
    const state = location.state as Partial<TreatmentHandoff> | null
    const detection = state?.source === 'detection' || Boolean(state?.initialTopic || state?.initialMessage)
    if (detection) {
      const id = state?.handoffId || location.key
      const claimed = store.claimHandoff(userId, id)
      navigate(location.pathname, { replace: true, state: {} })
      initializedUserRef.current = userId
      if (!claimed) return
      setMicLang('si-LK')
      setConversationLang('si')
      setRestored(false)
      setSendError(null)
      setSessionExpired(false)
      startNewSession(userId)
      store.updateSessionPreferences(userId, { conversationLanguage: 'si', microphoneLanguage: 'si-LK', contextUnavailable: false })
      setTab('chat')
      setSelectedChat(null)
      setInput('')
      const message = state?.initialTopic
        ? formatInitialAdvisorMessage(state.initialTopic, 'si', state.detectionType === 'pest')
        : state?.initialMessage
      if (message) void handleSend(message, true)
      return
    }
    if (initializedUserRef.current === userId) return
    initializedUserRef.current = userId
    setRestored(Boolean(store.sessions[userId]?.messages.length))
    store.ensureSession(userId)
    const active = useChatStore.getState().sessions[userId]
    const questionLanguage = active.conversationLanguage || conversationLang
    const microphoneLanguage = active.microphoneLanguage || micLang
    setConversationLang(questionLanguage)
    setMicLang(microphoneLanguage)
    store.updateSessionPreferences(userId, { conversationLanguage: questionLanguage, microphoneLanguage })
    setTab('chat')
    setSelectedChat(null)
    setInput('')
    setSessionExpired(Boolean(active.contextUnavailable))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, startNewSession, location.state, location.key])

  /*
   * ==================================================
   * SPEAK MESSAGE
   * ==================================================
   */

  function speakMessage(
    id: string,
    text: string,
    language: SpeechLanguage
  ): void {
    if (
      language === 'si' &&
      !tts.hasNativeVoice('si') &&
      !warnedNoSinhalaVoiceRef.current
    ) {
      warnedNoSinhalaVoiceRef.current =
        true

      toast(
        'No Sinhala voice found on this device — reading with an English voice instead.',
        {
          icon: 'ℹ️',
        }
      )
    }

    tts.speak(
      id,
      text,
      language
    )
  }

  /*
   * ==================================================
   * LOAD TOPICS
   * ==================================================
   */

  useEffect(() => {
    let active = true

    void getChatTaxonomy().then(result => { if (active) setTaxonomy(result) })
    getChatTopics()
      .then((result) => {
        if (!active) {
          return
        }

        setTopics(
          Array.isArray(result)
            ? result
            : []
        )
      })
      .catch(() => {
        if (active) {
          setTopics([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  /*
   * ==================================================
   * AUTO SCROLL
   * ==================================================
   */

  useEffect(() => {
    if (!session) {
      return
    }

    const element =
      scrollRef.current

    if (!element) {
      return
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [session, sending])

  /*
   * ==================================================
   * SPEECH ERROR
   * ==================================================
   */

  useEffect(() => {
    if (recognition.error) {
      toast.error(
        recognition.error
      )
    }
  }, [
    recognition.error,
  ])

  /*
   * ==================================================
   * MICROPHONE
   * ==================================================
   */

  function handleMicToggle(): void {
    if (
      recognition.listening
    ) {
      recognition.stop()
      return
    }

    tts.stop()

    recognition.start(
      micLang
    )
  }

  function handleToggleMicLang(): void {
    setMicLang(
      (language) => {
        const next = language === 'en-US' ? 'si-LK' : 'en-US'
        useChatStore.getState().updateSessionPreferences(userId, { microphoneLanguage: next })
        return next
      }
    )
  }

  /*
   * ==================================================
   * CONTINUE HISTORY CHAT
   *
   * Restores the ORIGINAL sessionId.
   *
   * This means the backend can continue the same
   * conversation instead of creating a new one.
   * ==================================================
   */

  function handleContinueChat(
    archived: ArchivedChat
  ): void {
    tts.stop()

    if (
      recognition.listening
    ) {
      recognition.stop()
    }

    continueSession(
      userId,
      archived
    )
    const continued = useChatStore.getState().sessions[userId]
    setConversationLang(continued.conversationLanguage || conversationLang)
    setMicLang(continued.microphoneLanguage || micLang)
    setRestored(true)
    setSessionExpired(Boolean(continued.contextUnavailable))

    setTab('chat')
    setSelectedChat(null)
    setInput('')
    setSending(false)

    toast.success(uiText('Conversation restored. You can continue chatting.'))
  }

  /*
   * ==================================================
   * CONFIRM NEW CHAT
   * ==================================================
   */

  async function handleConfirmReset(): Promise<void> {
    if (!session) {
      setConfirmReset(false)
      return
    }

    setResetting(true)

    /*
     * Stop speech.
     */

    tts.stop()

    /*
     * Stop microphone.
     */

    if (
      recognition.listening
    ) {
      recognition.stop()
    }

    resetSession(userId)
    setSendError(null)
    useChatStore.getState().updateSessionPreferences(userId, { conversationLanguage: conversationLang, microphoneLanguage: micLang, contextUnavailable: false })
    setRestored(false)
    setSessionExpired(false)
    setInput('')
    setSending(false)
    setSelectedChat(null)
    setTab('chat')
    setResetting(false)
    setConfirmReset(false)
  }

  /*
   * ==================================================
   * LOADING STATE
   * ==================================================
   */

  if (!session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7.5rem)]">
        <div className="text-sm text-forest-muted">
          {uiText("Starting a new treatment chat...")}</div>
      </div>
    )
  }

  const hasMessages =
    session.messages.length >
    0

  /*
   * ==================================================
   * UI
   * ==================================================
   */

  return (
    <div className="pg-treatment mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[440px] max-w-4xl flex-col">

      {/* ============================================
          HEADER
          ============================================ */}

      <div className="flex items-center justify-between gap-2 mb-3">

        <div className="min-w-0">

          <h2 className="text-lg font-bold truncate font-sinhala text-forest">
            {uiText("ප්‍රතිකාර උපදේශක | Treatment Advisor")}</h2>

          <p className="text-xs truncate text-forest-muted">
            {uiText("Ask about rice leaf diseases and pests — in English or Sinhala")}</p>

        </div>

        {tab === 'chat' && (
          <div className="flex items-center gap-2 shrink-0">

            {/* TTS toggle */}

            {tts.supported && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    autoSpeak
                  ) {
                    tts.stop()
                  }

                  setAutoSpeak(
                    (value) =>
                      !value
                  )
                }}
                title={
                  uiText(autoSpeak
                    ? 'Auto-read replies: on'
                    : 'Auto-read replies: off')
                }
                aria-label={uiText(autoSpeak ? 'Auto-read replies: on' : 'Auto-read replies: off')}
              >
                {autoSpeak ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {/* New chat */}

            {hasMessages && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirmReset(
                    true
                  )
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />

                {uiText("New chat")}</Button>
            )}

          </div>
        )}

      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-forest-muted">
        <label className="flex items-center gap-2">{t('conversationLanguage')}
          <select className="rounded-lg border border-beige bg-white p-2 text-forest" value={conversationLang} onChange={e => {
            const language = e.target.value as 'si' | 'en'
            setConversationLang(language)
            useChatStore.getState().updateSessionPreferences(userId, { conversationLanguage: language })
          }}>
            <option value="si">සිංහල</option><option value="en">English</option>
          </select>
        </label>
        <span>{t('replyLanguageHelp')}</span>
      </div>
      {sendError && <p role="alert" className="mb-3 rounded-xl bg-red-soft/10 p-3 text-xs leading-relaxed text-red-soft">{sendError}</p>}
      {sessionExpired && <div role="status" className="mb-3 rounded-xl border border-amber/30 bg-amber-light/40 p-3 text-xs leading-relaxed text-forest">
        <p>{t('expiredChatHelp')}</p>
        <Button className="mt-2" size="sm" variant="outline" onClick={() => setConfirmReset(true)}>{uiText('New chat')}</Button>
      </div>}

      {/* ============================================
          TAB NAVIGATION
          ============================================ */}

      <div className="pg-segmented flex gap-2 p-1 mb-3 rounded-xl bg-beige" role="tablist" aria-label={uiText("Treatment Advisor") }>

        <button
          type="button"
          role="tab" aria-selected={tab === 'chat'}
          onClick={() =>
            setTab('chat')
          }
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'chat'
              ? 'bg-white text-forest shadow-sm'
              : 'text-forest-muted'
          }`}
        >
          <MessageCircle className="w-4 h-4" />

          {uiText("Chat")}</button>

        <button
          type="button"
          role="tab" aria-selected={tab === 'history'}
          onClick={() =>
            setTab('history')
          }
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'history'
              ? 'bg-white text-forest shadow-sm'
              : 'text-forest-muted'
          }`}
        >
          <Clock className="w-4 h-4" />

          {uiText("History")}{archivedChats.length >
            0 && (
            <span className="ml-1 text-xs">
              (
              {
                archivedChats.length
              }
              )
            </span>
          )}

        </button>

      </div>

      {/* ============================================
          CHAT TAB
          ============================================ */}

      {tab === 'chat' ? (
        <>
          <div
            ref={scrollRef}
            className="flex-1 p-4 space-y-4 overflow-y-auto rounded-2xl bg-beige/40"
          >

            {!hasMessages ? (

              <div className="flex flex-col items-center justify-center h-full gap-5 px-4 text-center">

                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber">
                  <Sprout className="w-8 h-8 text-white" />
                </div>

                <div>

                  <p className="text-lg font-bold font-sinhala text-forest">
                    {uiText("ආයුබෝවන්!")}</p>

                  <p className="max-w-sm mx-auto text-sm text-forest-muted">
                    {uiText("Ask me about rice diseases, pests, symptoms, prevention, or chemical treatments — by typing or tapping the mic. Try one of these to get a full report:")}</p>

                </div>

                <TopicChips
                  topics={topics}
                  language={conversationLang}
                  taxonomy={taxonomy}
                  onSelect={(
                    topic
                  ) => {
                    void handleSend(formatInitialAdvisorMessage(topic, conversationLang, /planthopper|midge|folder|hispa|borer/i.test(findTaxonomyTopic(topic, taxonomy)?.canonical || topic)))
                  }}
                  disabled={
                    sending
                  }
                />
                <p className="max-w-sm text-[11px] text-forest-muted">{t('localTaxonomyHelp')}</p>

              </div>

            ) : (

              <>

                {session.messages.map(
                  (message) => {
                    const language =
                      normalizeSpeechLanguage(
                        message.language
                      )

                    return (
                      <ChatBubble
                        key={
                          message.id
                        }
                        message={
                          message
                        }
                        onAskFollowUp={(
                          question
                        ) => {
                          void handleSend(
                            question
                          )
                        }}
                        ttsSupported={
                          tts.supported
                        }
                        speaking={
                          tts.speakingId ===
                          message.id
                        }
                        onToggleSpeak={() => {
                          if (
                            tts.speakingId ===
                            message.id
                          ) {
                            tts.stop()
                          } else {
                            speakMessage(
                              message.id,
                              stripLiteMarkdown(
                                message.content
                              ),
                              language
                            )
                          }
                        }}
                      />
                    )
                  }
                )}

                {sending && (
                  <TypingIndicator />
                )}

              </>
            )}

          </div>

          {/* Composer */}

          <div className="mt-3">

            <ChatComposer
              value={input}
              onChange={
                setInput
              }
              onSend={() => {
                void handleSend()
              }}
              disabled={sending || sessionExpired}
              micSupported={
                recognition.supported
              }
              listening={
                recognition.listening
              }
              interimText={
                recognition.interimTranscript
              }
              onMicToggle={
                handleMicToggle
              }
              micLang={
                micLang
              }
              onToggleMicLang={
                handleToggleMicLang
              }
            />

          </div>
        </>

      ) : (

        /* ==========================================
           HISTORY
           ========================================== */

        <div className="flex-1 space-y-3 overflow-y-auto">

          {archivedChats.length ===
          0 ? (

            <EmptyState
              icon={Clock}
              title={uiText("No past conversations yet")}
              description={uiText("Your previous treatment conversations will appear here.")}
            />

          ) : (

            archivedChats.map(
              (entry) => (
                <Card
                  key={
                    entry.sessionId
                  }
                  hoverable
                  className="pg-history-card cursor-pointer"
                >

                  <div className="flex items-center justify-between gap-3">

                    {/* Conversation preview */}

                    <div
                      className="flex-1 min-w-0"
                      onClick={() =>
                        setSelectedChat(
                          entry
                        )
                      }
                    >

                      <p className="font-medium truncate text-forest">
                        {chatPreview(
                          entry.messages
                        )}
                      </p>

                      <p className="mt-1 text-xs text-forest-muted">
                        {formatDate(
                          entry.archivedAt
                        )}
                      </p>

                    </div>

                    {/* Message count */}

                    <Badge
                      tone="gray"
                      className="shrink-0"
                    >
                      {
                        entry
                          .messages
                          .length
                      }{' '}
                      {uiText("msgs")}</Badge>

                    {/* Continue */}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        handleContinueChat(
                          entry
                        )
                      }
                    >
                      <Play className="h-3.5 w-3.5" />

                      {uiText("Continue")}</Button>

                  </div>

                </Card>
              )
            )

          )}

        </div>
      )}

      {/* ============================================
          NEW CHAT CONFIRMATION
          ============================================ */}

      <ConfirmDialog
        isOpen={
          confirmReset
        }
        title={uiText("Start a new chat?")}
        message={uiText("Your current conversation will be saved in History and a fresh treatment conversation will be started.")}
        confirmLabel={uiText("Start new chat")}
        danger
        loading={
          resetting
        }
        onConfirm={() => {
          void handleConfirmReset()
        }}
        onCancel={() =>
          setConfirmReset(
            false
          )
        }
      />

      {/* ============================================
          HISTORY PREVIEW
          ============================================ */}

      <Modal
        isOpen={Boolean(
          selectedChat
        )}
        onClose={() =>
          setSelectedChat(
            null
          )
        }
        title={uiText("Treatment Advisor Conversation")}
        size="lg"
      >

        <div className="space-y-4">

          {selectedChat?.messages.map(
            (message) => (
              <ChatBubble
                key={
                  message.id
                }
                message={
                  message
                }
              />
            )
          )}

        </div>

        {/* Continue button */}

        {selectedChat && (
          <div className="flex justify-end pt-5 mt-5 border-t border-beige">

            <Button
              variant="primary"
              onClick={() =>
                handleContinueChat(
                  selectedChat
                )
              }
            >
              <Play className="w-4 h-4" />

              {uiText("Continue this conversation")}</Button>

          </div>
        )}

      </Modal>

    </div>
  )
}
