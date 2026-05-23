import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Agent, FlowDefinition, FlowSession, StepContext, StepStatus, Message, Provider, TokenUsage, ResumableFlowSession, RoundPauseMode } from '../types'
import { FlowProgress } from './FlowProgress'
import { FlowStepCard } from './FlowStepCard'
import { DiscussionArena } from './DiscussionArena'
import { SummaryView } from './SummaryView'
import { resolveStepContext } from '../utils/flowUtils'
import { saveResumableSession, clearResumableSession } from '../hooks/useResumableSession'

interface Props {
  flow: FlowDefinition
  agents: Agent[]
  topic: string
  providers: Provider[]
  defaultProviderId: string
  summaryProviderId: string
  onReset: () => void
  /** Controls behavior between steps:
   *  - 'none'   skip the between-steps card entirely; auto-advance
   *  - 'always' show the card and wait for user to click continue
   *  - number   show the card and auto-advance after N seconds
   */
  roundPauseMode: RoundPauseMode
  /** When provided, FlowController hydrates its internal state from the
   *  saved snapshot instead of starting fresh from step 0. */
  restoreSession?: ResumableFlowSession
}

type FlowPhase = 'idle' | 'running-step' | 'between-steps' | 'summarizing' | 'done'

export function FlowController({
  flow, agents, topic, providers, defaultProviderId, summaryProviderId, onReset, roundPauseMode, restoreSession,
}: Props) {
  const [session, setSession] = useState<FlowSession>(() => {
    // Hydrate from a saved snapshot (resume) when one is provided
    if (restoreSession) {
      return {
        flowId: restoreSession.flow.id,
        flowDefinition: { ...restoreSession.flow },
        currentStepIndex: restoreSession.currentStepIndex,
        stepStatuses: [...restoreSession.stepStatuses],
        stepContexts: [...restoreSession.stepContexts],
        userFeedbacks: { ...restoreSession.userFeedbacks },
        startedAt: restoreSession.startedAt,
        status: 'running',
      }
    }
    return {
      flowId: flow.id,
      flowDefinition: { ...flow },
      currentStepIndex: 0,
      stepStatuses: flow.steps.map(() => 'pending' as StepStatus),
      stepContexts: [],
      userFeedbacks: {},
      startedAt: Date.now(),
      status: 'running',
    }
  })

  const [phase, setPhase] = useState<FlowPhase>('idle')
  const [messages, setMessages] = useState<Message[]>(() => restoreSession?.currentStepMessages ?? [])
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [streamingContent, setStreamingContent] = useState('')
  const [summary, setSummary] = useState('')
  const [paused, setPaused] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const isPausedRef = useRef(false)
  const pauseResolveRef = useRef<(() => void) | null>(null)
  // Use ref to track messages for the context generation (avoids stale closure)
  const messagesRef = useRef<Message[]>([])
  const sessionRef = useRef(session)
  sessionRef.current = session

  // Token batching: accumulate tokens in a ref and flush to state on a
  // ~10 Hz timer. The previous rAF (60 Hz) flush caused the whole step's
  // DiscussionArena to re-render 60 times per second; for a long
  // streaming message that was enough to grind the main thread to a
  // halt (Page Unresponsive). 100ms is visually indistinguishable for
  // text streaming and reduces re-render cost by ~6x.
  const streamBufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushStreamBuffer = useCallback(() => {
    if (streamBufferRef.current) {
      const buffered = streamBufferRef.current
      streamBufferRef.current = ''
      setStreamingContent(prev => prev + buffered)
    }
    flushTimerRef.current = null
  }, [])

  const appendToken = useCallback((token: string) => {
    streamBufferRef.current += token
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushStreamBuffer, 100)
    }
  }, [flushStreamBuffer])

  const currentStep = session.flowDefinition.steps[session.currentStepIndex]
  const totalRounds = currentStep?.rounds || 2

  const getProviderSettings = useCallback(() => {
    const m: Record<string, { apiKey: string; baseUrl: string; model: string; maxTokens?: number }> = {}
    for (const p of providers) { if (p.apiKey) m[p.id] = { apiKey: p.apiKey, baseUrl: p.baseUrl, model: p.model, maxTokens: p.maxTokens } }
    return m
  }, [providers])

  // Keep messagesRef in sync
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Auto-start on mount (guard against StrictMode double-invoke).
  // When resuming, find the first non-completed step and continue from there.
  const startedRef = useRef(false)
  useEffect(() => {
    if (phase === 'idle' && !startedRef.current) {
      startedRef.current = true
      const total = sessionRef.current.flowDefinition.steps.length
      let startIndex = 0
      for (let i = 0; i < total; i++) {
        if (sessionRef.current.stepStatuses[i] !== 'completed' && sessionRef.current.stepStatuses[i] !== 'skipped') {
          startIndex = i
          break
        }
      }
      // If every step was already completed, jump to summary
      if (sessionRef.current.stepStatuses.every(s => s === 'completed' || s === 'skipped')) {
        generateFlowSummary()
      } else {
        startStep(startIndex)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-persist the session snapshot whenever its core state changes
  // so the user can recover after an unexpected exit.
  useEffect(() => {
    if (phase === 'done' || session.status === 'completed') return
    saveResumableSession({
      kind: 'flow',
      topic,
      agents,
      flow: session.flowDefinition,
      currentStepIndex: session.currentStepIndex,
      stepStatuses: session.stepStatuses,
      stepContexts: session.stepContexts,
      userFeedbacks: session.userFeedbacks,
      currentStepMessages: messages,
      startedAt: session.startedAt,
      updatedAt: Date.now(),
    })
  }, [phase, session, messages, topic, agents])

  // Start a specific step
  const isExecutingRef = useRef(false)
  const startStep = async (stepIndex: number) => {
    if (isExecutingRef.current) return // prevent concurrent execution
    isExecutingRef.current = true
    const step = sessionRef.current.flowDefinition.steps[stepIndex]
    if (!step) { isExecutingRef.current = false; return }

    setPhase('running-step')
    setMessages([])
    messagesRef.current = []
    setStreamingContent('')
    setCurrentAgent(null)
    setCurrentRound(0)
    setPaused(false)
    isPausedRef.current = false

    // Update status to running
    setSession(prev => {
      const statuses = [...prev.stepStatuses]
      statuses[stepIndex] = 'running'
      return { ...prev, currentStepIndex: stepIndex, stepStatuses: statuses }
    })

    // Resolve context for this step
    const contextToInject = resolveStepContext(
      step, sessionRef.current.stepContexts, sessionRef.current.stepStatuses, sessionRef.current.flowDefinition.steps
    )

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/flow/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${topic}\n\n\u5f53\u524d\u8ba8\u8bba\u6b65\u9aa4\uff1a${step.topic}`,
          agents,
          rounds: step.rounds ?? 2,
          language: 'zh',
          step_id: step.id,
          step_index: stepIndex,
          total_steps: sessionRef.current.flowDefinition.steps.length,
          accumulated_context: contextToInject.map(c => ({
            step_id: c.stepId, topic: c.topic, rounds: c.rounds, agents: c.agents, summary: c.summary,
          })),
          default_provider_id: defaultProviderId,
          step_provider_id: step.providerId, // per-step model override
          providers: getProviderSettings(),
          user_feedback: sessionRef.current.userFeedbacks[step.id] ? [sessionRef.current.userFeedbacks[step.id]] : undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        if (isPausedRef.current) {
          await new Promise<void>(r => { pauseResolveRef.current = r })
        }
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (!data) continue
            try {
              const event = JSON.parse(data)
              handleSSE(event)
            } catch { /* skip malformed */ }
          }
        }
      }

      // Stream finished - generate step context using ref (has latest messages)
      await finishStep(stepIndex, step)
      isExecutingRef.current = false

    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // User stopped - still try to generate context from what we have
        await finishStep(stepIndex, step)
        isExecutingRef.current = false
        return
      }
      console.error('Step execution error:', e)
      // Mark as completed anyway to avoid getting stuck
      await finishStep(stepIndex, step)
      isExecutingRef.current = false
    }
  }

  // Finish a step: generate context summary and transition
  const finishStep = async (stepIndex: number, step: typeof currentStep) => {
    if (!step) return
    const currentMessages = messagesRef.current.filter(m => m.agent_id !== '__user__')

    let summaryText = '\u672a\u80fd\u751f\u6210\u6458\u8981'

    if (currentMessages.length > 0) {
      try {
        const response = await fetch('/api/flow/step-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_id: step.id,
            step_topic: step.topic,
            messages: currentMessages.map(m => ({ agent_name: m.agent_name, content: m.content })),
            agents,
            language: 'zh',
            provider_id: summaryProviderId || defaultProviderId,
            providers: getProviderSettings(),
          }),
        })
        if (response.ok) {
          const data = await response.json()
          summaryText = data.summary || summaryText
        }
      } catch {
        // Use fallback summary
        summaryText = currentMessages.map(m => `${m.agent_name}: ${m.content.slice(0, 100)}`).join('\n')
      }
    }

    const newContext: StepContext = {
      stepId: step.id,
      topic: step.topic,
      rounds: step.rounds ?? 2,
      agents: agents.map(a => a.name),
      summary: summaryText,
      completedAt: Date.now(),
    }

    // Update session with completed status and new context
    const updatedStatuses = [...sessionRef.current.stepStatuses]
    updatedStatuses[stepIndex] = 'completed'
    const newSession: FlowSession = {
      ...sessionRef.current,
      stepStatuses: updatedStatuses,
      stepContexts: [...sessionRef.current.stepContexts, newContext],
    }
    sessionRef.current = newSession
    setSession(newSession)

    // Determine next phase (outside of setState updater!)
    const nextIndex = findNextPendingInStatuses(updatedStatuses, stepIndex + 1, newSession.flowDefinition.steps.length)
    if (nextIndex === -1) {
      // All steps done - generate final summary
      generateFlowSummary()
    } else if (roundPauseMode === 'none') {
      // User opted out of between-step pause: jump straight into the
      // next step. Defer one tick to let React commit the state update
      // for the just-completed step before we mutate again.
      setTimeout(() => startStep(nextIndex), 0)
    } else {
      // 'always': show the between-steps card and wait for user action.
      setPhase('between-steps')
    }
  }

  // Find next pending step in a given statuses array (pure function, no closure dependency)
  const findNextPendingInStatuses = (statuses: StepStatus[], startFrom: number, total: number): number => {
    for (let i = startFrom; i < total; i++) {
      if (statuses[i] === 'pending') return i
    }
    return -1
  }

  const findNextPendingStep = (startFrom: number): number => {
    return findNextPendingInStatuses(sessionRef.current.stepStatuses, startFrom, sessionRef.current.flowDefinition.steps.length)
  }

  // Move to next step
  const continueToNextStep = () => {
    const nextIndex = findNextPendingStep(sessionRef.current.currentStepIndex + 1)
    if (nextIndex === -1) {
      generateFlowSummary()
      return
    }
    startStep(nextIndex)
  }

  // Skip next step
  const skipNextStep = () => {
    const nextIndex = findNextPendingStep(sessionRef.current.currentStepIndex + 1)
    if (nextIndex === -1) return
    setSession(prev => {
      const statuses = [...prev.stepStatuses]
      statuses[nextIndex] = 'skipped'
      const updated = { ...prev, stepStatuses: statuses }
      sessionRef.current = updated
      return updated
    })
    // Check if there's another one after
    const afterNext = findNextPendingInStatuses(
      [...sessionRef.current.stepStatuses.slice(0, nextIndex), 'skipped', ...sessionRef.current.stepStatuses.slice(nextIndex + 1)],
      nextIndex + 1,
      sessionRef.current.flowDefinition.steps.length
    )
    if (afterNext === -1) {
      setTimeout(() => generateFlowSummary(), 100)
    }
    // Stay in between-steps, UI will update
  }

  // Retry an already-completed step.
  // Wipes the chosen step's status / context AND every subsequent step's
  // status / context (because their accumulated_context derived from the
  // old summary is now stale), then re-runs from the chosen step.
  const retryStep = useCallback((stepIndex: number) => {
    if (isExecutingRef.current) return
    const total = sessionRef.current.flowDefinition.steps.length
    if (stepIndex < 0 || stepIndex >= total) return

    const stepIdsAfter = new Set<string>()
    for (let i = stepIndex; i < total; i++) {
      stepIdsAfter.add(sessionRef.current.flowDefinition.steps[i].id)
    }

    setSession(prev => {
      const newStatuses = [...prev.stepStatuses]
      for (let i = stepIndex; i < total; i++) newStatuses[i] = 'pending'
      const newContexts = prev.stepContexts.filter(c => !stepIdsAfter.has(c.stepId))
      const updated: FlowSession = {
        ...prev,
        stepStatuses: newStatuses,
        stepContexts: newContexts,
        currentStepIndex: stepIndex,
        status: 'running',
      }
      sessionRef.current = updated
      return updated
    })
    // Kick off the step on the next tick so the state updates land first.
    setTimeout(() => startStep(stepIndex), 0)
  }, [])

  // Reorder remaining steps
  const handleReorder = (fromIndex: number, toIndex: number) => {
    setSession(prev => {
      const pendingIndices: number[] = []
      for (let i = prev.currentStepIndex + 1; i < prev.flowDefinition.steps.length; i++) {
        if (prev.stepStatuses[i] === 'pending') pendingIndices.push(i)
      }
      const newSteps = [...prev.flowDefinition.steps]
      const actualFrom = pendingIndices[fromIndex]
      const actualTo = pendingIndices[toIndex]
      if (actualFrom !== undefined && actualTo !== undefined) {
        const temp = newSteps[actualFrom]
        newSteps[actualFrom] = newSteps[actualTo]
        newSteps[actualTo] = temp
      }
      const updated = { ...prev, flowDefinition: { ...prev.flowDefinition, steps: newSteps } }
      sessionRef.current = updated
      return updated
    })
  }

  // Add user feedback for next step
  const handleFeedback = (text: string) => {
    const nextIndex = findNextPendingStep(sessionRef.current.currentStepIndex + 1)
    if (nextIndex === -1) return
    const nextStep = sessionRef.current.flowDefinition.steps[nextIndex]
    setSession(prev => {
      const updated = { ...prev, userFeedbacks: { ...prev.userFeedbacks, [nextStep.id]: text } }
      sessionRef.current = updated
      return updated
    })
  }

  // Generate final flow summary
  const generateFlowSummary = async () => {
    setPhase('summarizing')
    const contexts = sessionRef.current.stepContexts
    try {
      const response = await fetch('/api/flow/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow_name: flow.name,
          topic,
          completed_steps: contexts.map(c => ({
            step_id: c.stepId, topic: c.topic, rounds: c.rounds, agents: c.agents, summary: c.summary,
          })),
          agents,
          language: 'zh',
          provider_id: summaryProviderId || defaultProviderId,
          providers: getProviderSettings(),
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      } else {
        setSummary(contexts.map(c => `## ${c.topic}\n${c.summary}`).join('\n\n'))
      }
    } catch {
      setSummary(contexts.map(c => `## ${c.topic}\n${c.summary}`).join('\n\n'))
    }
    setPhase('done')
    setSession(prev => ({ ...prev, status: 'completed' }))
    // Flow finished -> persisted session is no longer needed
    clearResumableSession()
  }

  // SSE event handler
  const handleSSE = (event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case 'round_start': setCurrentRound(event.round as number); break
      case 'agent_start':
        setCurrentAgent(event.agent_id as string)
        setStreamingContent('')
        streamBufferRef.current = ''
        break
      case 'agent_token': appendToken(event.token as string); break
      case 'agent_done': {
        // Drain any pending tokens before finalizing
        if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }
        flushStreamBuffer()
        streamBufferRef.current = ''
        const msg: Message = {
          agent_id: event.agent_id as string,
          agent_name: event.agent_name as string,
          round: event.round as number,
          content: event.content as string,
          timestamp: Date.now(),
          usage: event.usage as TokenUsage | undefined,
        }
        setMessages(prev => { const updated = [...prev, msg]; messagesRef.current = updated; return updated })
        setCurrentAgent(null)
        setStreamingContent('')
        break
      }
    }
  }

  // Pause/resume/stop
  const pauseStep = useCallback(() => { setPaused(true); isPausedRef.current = true }, [])
  const resumeStep = useCallback(() => {
    setPaused(false); isPausedRef.current = false
    if (pauseResolveRef.current) { pauseResolveRef.current(); pauseResolveRef.current = null }
  }, [])
  const stopStep = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    setCurrentAgent(null); setStreamingContent(''); setPaused(false); isPausedRef.current = false
  }, [])

  // Derived state
  const remainingSteps = session.flowDefinition.steps.filter((_, i) =>
    i > session.currentStepIndex && session.stepStatuses[i] === 'pending'
  )
  const nextPendingIndex = findNextPendingStep(session.currentStepIndex + 1)
  const nextStep = nextPendingIndex >= 0 ? session.flowDefinition.steps[nextPendingIndex] : null
  const lastCompletedContext = session.stepContexts[session.stepContexts.length - 1] || null

  if (phase === 'done') {
    return <SummaryView summary={summary} messages={[]} agents={agents} topic={`${flow.name} - ${topic}`} />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[70vh]"
    >
      {/* Left: Flow Progress */}
      <div className="lg:col-span-1">
        <div className="glass-card p-4 sticky top-24 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{'\u8ba8\u8bba\u6d41\u7a0b'}</h3>
            <button onClick={onReset} className="text-[10px] text-gray-600 hover:text-gray-400">{'\u91cd\u7f6e'}</button>
          </div>
          <FlowProgress
            steps={session.flowDefinition.steps}
            currentStepIndex={session.currentStepIndex}
            stepStatuses={session.stepStatuses}
            stepContexts={session.stepContexts}
            onStepClick={() => {}}
            onRetryStep={retryStep}
            canRetry={!isExecutingRef.current && phase !== 'running-step' && phase !== 'summarizing'}
          />
        </div>
      </div>

      {/* Right: Current step content */}
      <div className="lg:col-span-3">
        <AnimatePresence mode="wait">
          {phase === 'running-step' && currentStep && (
            <div key={`step-${session.currentStepIndex}`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
                  {'\u6b65\u9aa4'} {session.currentStepIndex + 1}/{session.flowDefinition.steps.length}
                </div>
                <span className="text-sm text-gray-300">{currentStep.topic.slice(0, 50)}</span>
              </div>

              <DiscussionArena
                agents={agents}
                messages={messages}
                currentAgent={currentAgent}
                currentRound={currentRound}
                totalRounds={totalRounds}
                streamingContent={streamingContent}
                isSummarizing={false}
                topic={currentStep.topic}
                paused={paused}
                onPause={pauseStep}
                onResume={resumeStep}
                onStop={stopStep}
                onContinue={() => {}}
                onUserFeedback={() => {}}
                roundPauseMode="none"
                embedded
              />
            </div>
          )}

          {phase === 'between-steps' && (
            <motion.div key="between-steps" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <FlowStepCard
                completedStep={currentStep}
                completedContext={lastCompletedContext}
                nextStep={nextStep}
                remainingSteps={remainingSteps}
                onContinue={continueToNextStep}
                onSkip={skipNextStep}
                onReorder={handleReorder}
                onFeedback={handleFeedback}
                countdown={null}
              />
            </motion.div>
          )}

          {phase === 'summarizing' && (
            <motion.div key="summarizing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="w-16 h-16 mx-auto rounded-full border-2 border-purple-500/30 border-t-purple-500 flex items-center justify-center"
              >
                <span className="text-2xl">{'\ud83d\udcdd'}</span>
              </motion.div>
              <div>
                <p className="text-gray-300 font-medium">{'\u6b63\u5728\u7efc\u5408\u6240\u6709\u6b65\u9aa4\u7684\u8ba8\u8bba\u7ed3\u679c'}</p>
                <p className="text-gray-500 text-sm mt-1">{'\u751f\u6210\u6700\u7ec8\u67b6\u6784\u8bbe\u8ba1\u65b9\u6848...'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
