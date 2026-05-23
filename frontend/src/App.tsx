import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Settings, Clock } from 'lucide-react'
import { SetupPanel } from './components/SetupPanel'
import { DiscussionArena } from './components/DiscussionArena'
import { SummaryView } from './components/SummaryView'
import { ParticleBackground } from './components/ParticleBackground'
import { SettingsPanel } from './components/SettingsPanel'
import { FlowController } from './components/FlowController'
import { HistoryPanel } from './components/HistoryPanel'
import { ResumeBanner } from './components/ResumeBanner'
import type { Agent, Message, DiscussionStatus, Provider, RoundPauseMode, DiscussionMode, FlowDefinition, HistoryRecord, TokenUsage, ResumableSession, ResumableFlowSession } from './types'
import { DEFAULT_FLOW } from './data/defaultFlow'
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys'
import { usePendingResume, saveResumableSession, clearResumableSession } from './hooks/useResumableSession'

const DEFAULT_AGENTS: Agent[] = [
  { id: 'architect', name: '\u7cfb\u7edf\u67b6\u6784\u5e08', role: 'System Architect', avatar: '\ud83c\udfd7\ufe0f', color: '#6366f1', system_prompt: '\u4f60\u662f\u4e00\u4f4d\u8d44\u6df1\u7cfb\u7edf\u67b6\u6784\u5e08\uff0c\u62e5\u670920\u5e74\u5927\u578b\u5206\u5e03\u5f0f\u7cfb\u7edf\u8bbe\u8ba1\u7ecf\u9a8c\u3002\n\u4f60\u7684\u804c\u8d23\u662f\uff1a\u4ece\u5168\u5c40\u89c6\u89d2\u8bbe\u8ba1\u7cfb\u7edf\u67b6\u6784\uff0c\u5173\u6ce8\u53ef\u6269\u5c55\u6027\u3001\u53ef\u7ef4\u62a4\u6027\uff0c\u63d0\u51fa\u5408\u7406\u7684\u6280\u672f\u9009\u578b\u5efa\u8bae\uff0c\u5b9a\u4e49\u6e05\u6670\u7684\u6a21\u5757\u8fb9\u754c\u548c\u63a5\u53e3\u3002\n\u8ba8\u8bba\u65f6\u8bf7\u7b80\u6d01\u4e13\u4e1a\uff0c\u76f4\u63a5\u7ed9\u51fa\u89c1\u89e3\u3002' },
  { id: 'security', name: '\u5b89\u5168\u4e13\u5bb6', role: 'Security Expert', avatar: '\ud83d\udee1\ufe0f', color: '#ef4444', system_prompt: '\u4f60\u662f\u4e00\u4f4d\u7f51\u7edc\u5b89\u5168\u4e13\u5bb6\uff0c\u4e13\u6ce8\u4e8e\u7cfb\u7edf\u5b89\u5168\u67b6\u6784\u8bbe\u8ba1\u3002\n\u4f60\u7684\u804c\u8d23\u662f\uff1a\u8bc6\u522b\u6f5c\u5728\u5b89\u5168\u5a01\u80c1\u548c\u6f0f\u6d1e\uff0c\u63d0\u51fa\u5b89\u5168\u9632\u62a4\u65b9\u6848\uff0c\u786e\u4fdd\u6570\u636e\u9690\u79c1\u548c\u5408\u89c4\u6027\uff0c\u8bbe\u8ba1\u8ba4\u8bc1\u6388\u6743\u673a\u5236\u3002\n\u8ba8\u8bba\u65f6\u8bf7\u6307\u51fa\u5b89\u5168\u9690\u60a3\u5e76\u63d0\u4f9b\u5177\u4f53\u52a0\u56fa\u5efa\u8bae\u3002' },
  { id: 'performance', name: '\u6027\u80fd\u5de5\u7a0b\u5e08', role: 'Performance Engineer', avatar: '\u26a1', color: '#f59e0b', system_prompt: '\u4f60\u662f\u4e00\u4f4d\u6027\u80fd\u4f18\u5316\u4e13\u5bb6\uff0c\u64c5\u957f\u9ad8\u5e76\u53d1\u7cfb\u7edf\u8bbe\u8ba1\u3002\n\u4f60\u7684\u804c\u8d23\u662f\uff1a\u5206\u6790\u7cfb\u7edf\u6027\u80fd\u74f6\u9888\uff0c\u8bbe\u8ba1\u9ad8\u6027\u80fd\u67b6\u6784\u65b9\u6848\uff0c\u63d0\u51fa\u7f13\u5b58\u3001\u5f02\u6b65\u3001\u5206\u7247\u7b49\u4f18\u5316\u7b56\u7565\u3002\n\u8ba8\u8bba\u65f6\u8bf7\u8bc4\u4f30\u6027\u80fd\u8868\u73b0\u5e76\u7ed9\u51fa\u5177\u4f53\u4f18\u5316\u5efa\u8bae\u3002' },
  { id: 'devops', name: 'DevOps\u5de5\u7a0b\u5e08', role: 'DevOps Engineer', avatar: '\ud83d\ude80', color: '#10b981', system_prompt: '\u4f60\u662f\u4e00\u4f4dDevOps\u4e13\u5bb6\uff0c\u7cbe\u901aCI/CD\u548c\u4e91\u539f\u751f\u67b6\u6784\u3002\n\u4f60\u7684\u804c\u8d23\u662f\uff1a\u8bbe\u8ba1\u90e8\u7f72\u548c\u8fd0\u7ef4\u65b9\u6848\uff0c\u89c4\u5212CI/CD\u6d41\u6c34\u7ebf\uff0c\u9009\u62e9\u5408\u9002\u7684\u4e91\u670d\u52a1\u548c\u5bb9\u5668\u7f16\u6392\uff0c\u786e\u4fdd\u7cfb\u7edf\u53ef\u89c2\u6d4b\u6027\u3002\n\u8ba8\u8bba\u65f6\u8bf7\u8bc4\u4f30\u53ef\u90e8\u7f72\u6027\u5e76\u63d0\u51fa\u57fa\u7840\u8bbe\u65bd\u5efa\u8bae\u3002' },
  { id: 'product', name: '\u4ea7\u54c1\u7ecf\u7406', role: 'Product Manager', avatar: '\ud83d\udccb', color: '#8b5cf6', system_prompt: '\u4f60\u662f\u4e00\u4f4d\u7ecf\u9a8c\u4e30\u5bcc\u7684\u6280\u672f\u4ea7\u54c1\u7ecf\u7406\u3002\n\u4f60\u7684\u804c\u8d23\u662f\uff1a\u786e\u4fdd\u6280\u672f\u65b9\u6848\u6ee1\u8db3\u4e1a\u52a1\u9700\u6c42\uff0c\u4ece\u7528\u6237\u89d2\u5ea6\u8bc4\u4f30\u65b9\u6848\uff0c\u628a\u63a7\u9879\u76ee\u8303\u56f4\u548c\u4f18\u5148\u7ea7\uff0c\u534f\u8c03\u5404\u65b9\u610f\u89c1\u8fbe\u6210\u5171\u8bc6\u3002\n\u8ba8\u8bba\u65f6\u8bf7\u4ece\u7528\u6237\u4ef7\u503c\u89d2\u5ea6\u8bc4\u4f30\u5e76\u63d0\u51faMVP\u548c\u8fed\u4ee3\u7b56\u7565\u3002' },
]

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return fallback
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

function App() {
  const [status, setStatus] = useState<DiscussionStatus>('idle')
  const [allAgents, setAllAgents] = useState<Agent[]>(() => loadFromStorage('archimind-agents', DEFAULT_AGENTS))
  const [agents, setAgents] = useState<Agent[]>(() => loadFromStorage('archimind-selected-agents', DEFAULT_AGENTS.slice(0, 3)))
  const [topic, setTopic] = useState('')
  const [rounds, setRounds] = useState(3)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [streamingContent, setStreamingContent] = useState('')
  const [summary, setSummary] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [userFeedback, setUserFeedback] = useState<string[]>([])
  const [providers, setProviders] = useState<Provider[]>(() => loadFromStorage('archimind-providers', []))
  const [defaultProviderId, setDefaultProviderId] = useState<string>(() => loadFromStorage('archimind-default-provider', ''))
  const [summaryProviderId, setSummaryProviderId] = useState<string>(() => loadFromStorage('archimind-summary-provider', ''))
  const [roundPauseMode, setRoundPauseMode] = useState<RoundPauseMode>(() => {
    const stored = loadFromStorage<string>('archimind-round-pause', 'none')
    return stored === 'always' ? 'always' : 'none'
  })

  // Discussion mode
  const [mode, setMode] = useState<DiscussionMode>('ring')
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition>(DEFAULT_FLOW)
  const [customFlows, setCustomFlows] = useState<FlowDefinition[]>(() => loadFromStorage('archimind-custom-flows', []))
  const [flowActive, setFlowActive] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryRecord[]>(() => loadFromStorage('archimind-history', []))
  const [historyOpen, setHistoryOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<HistoryRecord | null>(null)

  // Track summary's own token usage (separate from per-message agent usage)
  const summaryUsageRef = useRef<TokenUsage | null>(null)

  // Resumable session: detected once on mount, cleared after user action
  const [pendingResume, setPendingResume] = usePendingResume()
  // When the user resumes a flow session, the snapshot is forwarded to
  // <FlowController> so it can hydrate its internal state.
  const [restoreFlowSession, setRestoreFlowSession] = useState<ResumableFlowSession | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const pauseResolveRef = useRef<(() => void) | null>(null)
  const isPausedRef = useRef(false)
  const messagesRef = useRef<Message[]>([])

  useEffect(() => { saveToStorage('archimind-agents', allAgents) }, [allAgents])
  useEffect(() => { saveToStorage('archimind-selected-agents', agents) }, [agents])
  useEffect(() => { saveToStorage('archimind-providers', providers) }, [providers])
  useEffect(() => { saveToStorage('archimind-default-provider', defaultProviderId) }, [defaultProviderId])
  useEffect(() => { saveToStorage('archimind-summary-provider', summaryProviderId) }, [summaryProviderId])
  useEffect(() => { saveToStorage('archimind-round-pause', roundPauseMode) }, [roundPauseMode])
  useEffect(() => { saveToStorage('archimind-custom-flows', customFlows) }, [customFlows])
  useEffect(() => { saveToStorage('archimind-history', history) }, [history])

  // Auto-persist ring-mode discussions while they're in flight, so the
  // user can recover from a crash / accidental tab close.
  useEffect(() => {
    if (mode !== 'ring') return
    if (status !== 'discussing' && status !== 'summarizing') return
    if (messages.length === 0) return
    saveResumableSession({
      kind: 'ring',
      topic,
      agents,
      rounds,
      messages,
      startedAt: messages[0]?.timestamp ?? Date.now(),
      updatedAt: Date.now(),
    })
  }, [mode, status, messages, topic, agents, rounds])

  // Token batching for ring mode.
  // Use a setTimeout-based throttle instead of rAF: ~10 Hz updates are
  // visually indistinguishable for streaming text and slash the cost of
  // re-rendering long MessageBubbles by 6x compared to 60Hz.
  const ringStreamBufferRef = useRef('')
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushRingBuffer = useCallback(() => {
    if (ringStreamBufferRef.current) {
      const buf = ringStreamBufferRef.current
      ringStreamBufferRef.current = ''
      setStreamingContent(prev => prev + buf)
    }
    ringTimerRef.current = null
  }, [])

  const getProviderSettings = () => {
    const m: Record<string, { apiKey: string; baseUrl: string; model: string; maxTokens?: number }> = {}
    for (const p of providers) { if (p.apiKey) m[p.id] = { apiKey: p.apiKey, baseUrl: p.baseUrl, model: p.model, maxTokens: p.maxTokens } }
    return m
  }

  const pauseDiscussion = useCallback(() => { setPaused(true); isPausedRef.current = true }, [])
  const resumeDiscussion = useCallback(() => {
    setPaused(false); isPausedRef.current = false
    if (pauseResolveRef.current) { pauseResolveRef.current(); pauseResolveRef.current = null }
  }, [])
  const stopDiscussion = useCallback(() => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null }
    setCurrentAgent(null); setStreamingContent(''); setPaused(false); isPausedRef.current = false
    setStatus('idle')
  }, [])
  const addUserFeedback = useCallback((feedback: string) => {
    setUserFeedback(prev => [...prev, feedback])
    setMessages(prev => [...prev, { agent_id: '__user__', agent_name: '\u7528\u6237\u53cd\u9988', round: currentRound, content: feedback, timestamp: Date.now() }])
  }, [currentRound])

  const runStream = async (body: object) => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    const response = await fetch('/api/discuss', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    })
    if (!response.ok) throw new Error('Failed')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      if (isPausedRef.current) await new Promise<void>(r => { pauseResolveRef.current = r })
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (!data) continue
          try { handleSSEEvent(JSON.parse(data)) } catch { /* skip */ }
        }
      }
    }
  }

  const startDiscussion = async () => {
    if (!topic.trim() || agents.length === 0) return
    // Starting a fresh run discards any older saved session
    clearResumableSession()
    setPendingResume(null)
    setStatus('discussing'); setMessages([]); setSummary(''); setCurrentRound(0)
    setStreamingContent(''); setPaused(false); setUserFeedback([]); isPausedRef.current = false
    try {
      await runStream({
        topic, agents, rounds, language: 'zh',
        default_provider_id: defaultProviderId,
        summary_provider_id: summaryProviderId || defaultProviderId,
        providers: getProviderSettings(), user_feedback: userFeedback,
      })
    } catch (e) { if ((e as Error).name !== 'AbortError') { console.error(e); setStatus('idle') } }
  }

  const continueDiscussion = async () => {
    setPaused(false); isPausedRef.current = false; setStreamingContent(''); setCurrentAgent(null)
    const agentMsgs = messages.filter(m => m.agent_id !== '__user__')
    const completedRounds = agentMsgs.length > 0 ? Math.max(...agentMsgs.map(m => m.round)) : 0
    const remainingRounds = rounds - completedRounds
    const history = agentMsgs.map(m => ({ agent_id: m.agent_id, agent_name: m.agent_name, round: m.round, content: m.content }))
    try {
      await runStream({
        topic, agents, rounds: remainingRounds <= 0 ? 0 : remainingRounds, language: 'zh',
        default_provider_id: defaultProviderId,
        summary_provider_id: summaryProviderId || defaultProviderId,
        providers: getProviderSettings(), existing_history: history,
        user_feedback: userFeedback, start_round: completedRounds + 1,
      })
    } catch (e) { if ((e as Error).name !== 'AbortError') console.error(e) }
  }

  const handleSSEEvent = (event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case 'round_start': setCurrentRound(event.round as number); break
      case 'agent_start':
        setCurrentAgent(event.agent_id as string); setStreamingContent(''); ringStreamBufferRef.current = ''
        if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null }
        break
      case 'agent_token':
        ringStreamBufferRef.current += (event.token as string)
        if (!ringTimerRef.current) { ringTimerRef.current = setTimeout(flushRingBuffer, 100) }
        break
      case 'agent_done':
        if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null }
        flushRingBuffer() // drain any pending tokens before finalizing
        ringStreamBufferRef.current = ''
        setMessages(prev => [...prev, {
          agent_id: event.agent_id as string,
          agent_name: event.agent_name as string,
          round: event.round as number,
          content: event.content as string,
          timestamp: Date.now(),
          usage: event.usage as TokenUsage | undefined,
        }])
        setCurrentAgent(null); setStreamingContent(''); break
      case 'summary_start': setStatus('summarizing'); setCurrentAgent(null); break
      case 'summary_done':
        setSummary(event.content as string)
        summaryUsageRef.current = (event.usage as TokenUsage | undefined) ?? null
        setStatus('done')
        saveToHistory(event.content as string)
        break
      case 'discussion_end': if (status !== 'done') setStatus('done'); break
    }
  }

  // Keep messagesRef in sync so callbacks always see the latest value
  useEffect(() => { messagesRef.current = messages }, [messages])

  const saveToHistory = useCallback((summaryContent: string) => {
    const summaryUsage = summaryUsageRef.current
    const latestMessages = messagesRef.current
    const agentTotal = latestMessages.reduce((sum, m) => sum + (m.usage?.total ?? 0), 0)
    const totalTokens = agentTotal + (summaryUsage?.total ?? 0)
    const record: HistoryRecord = {
      id: `hist-${Date.now()}`,
      topic,
      mode,
      agents: agents.map(a => ({ name: a.name, avatar: a.avatar, color: a.color })),
      summary: summaryContent,
      messages: latestMessages,
      flowName: mode === 'flow' ? selectedFlow.name : undefined,
      createdAt: Date.now(),
      totalTokens: totalTokens > 0 ? totalTokens : undefined,
      summaryUsage: summaryUsage ?? undefined,
    }
    setHistory(prev => [record, ...prev].slice(0, 50)) // Keep max 50 records
    // Discussion finished -> the persisted session is no longer needed
    clearResumableSession()
    setPendingResume(null)
  }, [topic, mode, agents, selectedFlow, setPendingResume])

  const resetDiscussion = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    setStatus('idle'); setMessages([]); setSummary(''); setCurrentAgent(null)
    setCurrentRound(0); setStreamingContent(''); setPaused(false); setUserFeedback([]); isPausedRef.current = false
    setFlowActive(false)
    setRestoreFlowSession(null)
    clearResumableSession()
    setPendingResume(null)
  }

  /** Hydrate state from a saved session and resume the run. */
  const handleResume = (session: ResumableSession) => {
    if (session.kind === 'ring') {
      setMode('ring')
      setTopic(session.topic)
      setAgents(session.agents)
      setRounds(session.rounds)
      setMessages(session.messages)
      setSummary(''); setCurrentAgent(null); setCurrentRound(0)
      setStreamingContent(''); setPaused(false); setUserFeedback([])
      isPausedRef.current = false
      setStatus('discussing')
      setPendingResume(null)
      // Continue from the last completed round
      setTimeout(() => continueDiscussion(), 0)
    } else {
      setMode('flow')
      setTopic(session.topic)
      setAgents(session.agents)
      setSelectedFlow(session.flow)
      setRestoreFlowSession(session)
      setPendingResume(null)
      setFlowActive(true)
    }
  }

  const handleDismissResume = () => {
    clearResumableSession()
    setPendingResume(null)
  }

  const startFlow = () => {
    if (!topic.trim() || agents.length === 0) return
    // Fresh run -> drop any leftover saved session
    setRestoreFlowSession(null)
    clearResumableSession()
    setPendingResume(null)
    setFlowActive(true)
  }

  /**
   * Resolve the flow that gets handed to FlowController:
   * each step keeps its own `rounds` if set, otherwise falls back to the
   * user-configured global `rounds` from SetupPanel.
   * This is computed inline (not stored in state) so the original
   * `selectedFlow` / `customFlows` data is never mutated.
   */
  const resolvedFlow: FlowDefinition = {
    ...selectedFlow,
    steps: selectedFlow.steps.map(step => ({
      ...step,
      rounds: step.rounds ?? rounds,
    })),
  }

  // Global keyboard shortcuts. Only wire up handlers that make sense for
  // the current state so e.g. Esc doesn't trigger stop on the setup screen.
  useGlobalHotkeys({
    onStart: status === 'idle' && !flowActive
      ? (mode === 'ring' ? startDiscussion : startFlow)
      : undefined,
    onTogglePause: status === 'discussing'
      ? (paused ? resumeDiscussion : pauseDiscussion)
      : undefined,
    onStop: status === 'discussing' ? stopDiscussion : undefined,
    onOpenSettings: () => setSettingsOpen(true),
    onOpenHistory: () => setHistoryOpen(true),
  })

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParticleBackground active={status === 'discussing' && !paused} />
      <div className="relative z-10 min-h-screen">
        <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">{'\ud83e\udde0'}</div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">ArchiMind</h1>
                <p className="text-xs text-gray-500">Multi-Agent Architecture Discussion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status !== 'idle' && (
                <button onClick={resetDiscussion} className="px-4 py-2 text-sm rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">{'\u65b0\u7684\u8ba8\u8bba'}</button>
              )}
              <button
                onClick={() => setHistoryOpen(true)}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors relative"
                title={'\u5386\u53f2\u8bb0\u5f55 (Ctrl+H)'}
              >
                <Clock size={16} className="text-gray-400" />
                {history.length > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {history.length > 9 ? '9+' : history.length}
                  </div>
                )}
              </button>
              <button onClick={() => setSettingsOpen(true)} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors relative" title="API \u8bbe\u7f6e (Ctrl+K)">
                <Settings size={16} className="text-gray-400" />
                {providers.some(p => p.apiKey) && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" />}
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {status === 'idle' && !flowActive && (
              <div key="setup-wrap">
                {pendingResume && (
                  <div className="max-w-4xl mx-auto mb-6">
                    <ResumeBanner
                      session={pendingResume}
                      onResume={() => handleResume(pendingResume)}
                      onDismiss={handleDismissResume}
                    />
                  </div>
                )}
                <SetupPanel agents={agents} setAgents={setAgents} allAgents={allAgents} setAllAgents={setAllAgents}
                  topic={topic} setTopic={setTopic} rounds={rounds} setRounds={setRounds} onStart={mode === 'ring' ? startDiscussion : startFlow}
                  providers={providers} defaultProviderId={defaultProviderId}
                  summaryProviderId={summaryProviderId} setSummaryProviderId={setSummaryProviderId}
                  roundPauseMode={roundPauseMode} setRoundPauseMode={setRoundPauseMode}
                  mode={mode} setMode={setMode}
                  selectedFlow={selectedFlow} setSelectedFlow={setSelectedFlow}
                  customFlows={customFlows} setCustomFlows={setCustomFlows} />
              </div>
            )}
            {flowActive && (
              <FlowController key="flow"
                flow={resolvedFlow} agents={agents} topic={topic}
                providers={providers} defaultProviderId={defaultProviderId}
                summaryProviderId={summaryProviderId} onReset={resetDiscussion}
                roundPauseMode={roundPauseMode}
                restoreSession={restoreFlowSession ?? undefined} />
            )}
            {(status === 'discussing' || status === 'summarizing') && (
              <DiscussionArena key="arena" agents={agents} messages={messages} currentAgent={currentAgent}
                currentRound={currentRound} totalRounds={rounds} streamingContent={streamingContent}
                isSummarizing={status === 'summarizing'} topic={topic} paused={paused}
                onPause={pauseDiscussion} onResume={resumeDiscussion} onStop={stopDiscussion}
                onContinue={continueDiscussion} onUserFeedback={addUserFeedback} roundPauseMode={roundPauseMode} onSetRoundPauseMode={setRoundPauseMode} />
            )}
            {status === 'done' && (
              <SummaryView key="summary" summary={summary} messages={messages} agents={agents} topic={topic} />
            )}
            {/* History record viewing is now a full-screen overlay (see below) */}
          </AnimatePresence>
        </main>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} providers={providers}
        onSaveProviders={setProviders} defaultProviderId={defaultProviderId} onSetDefaultProvider={setDefaultProviderId} />
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        records={history}
        onDelete={(id) => setHistory(prev => prev.filter(r => r.id !== id))}
        onClearAll={() => setHistory([])}
        onView={(record) => {
          setViewingRecord(record)
          setHistoryOpen(false)
        }}
      />

      {/* Full-screen overlay for viewing a history record */}
      <AnimatePresence>
        {viewingRecord && (
          <motion.div
            key="history-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col bg-gray-950/95 backdrop-blur-md"
          >
            {/* Overlay header */}
            <div className="shrink-0 border-b border-white/10 px-6 py-3 flex items-center justify-between bg-gray-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 transition-colors"
                >
                  ← 返回
                </button>
                <span className="text-sm text-gray-300 truncate max-w-md">{viewingRecord.topic}</span>
                <span className="text-[10px] text-gray-600">
                  {new Date(viewingRecord.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            {/* Overlay content — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <SummaryView
                summary={viewingRecord.summary}
                messages={viewingRecord.messages}
                agents={agents}
                topic={viewingRecord.topic}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
