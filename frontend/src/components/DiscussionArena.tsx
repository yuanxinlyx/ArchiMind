import { useEffect, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronDown, ChevronRight, Pause, Play, Square, Send, Star, Bell, BellOff } from 'lucide-react'

import type { Agent, Message, RoundPauseMode } from '../types'
import { AgentOrbit } from './AgentOrbit'
import { LiteMarkdown } from './LiteMarkdown'

interface Props {
  agents: Agent[]
  messages: Message[]
  currentAgent: string | null
  currentRound: number
  totalRounds: number
  streamingContent: string
  isSummarizing: boolean
  topic: string
  paused: boolean
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onContinue: () => void
  onUserFeedback: (feedback: string) => void
  roundPauseMode: RoundPauseMode
  onSetRoundPauseMode?: (mode: RoundPauseMode) => void
  embedded?: boolean // when true, hide "继续讨论" button (used inside FlowController)
}

export function DiscussionArena({
  agents,
  messages,
  currentAgent,
  currentRound,
  totalRounds,
  streamingContent,
  isSummarizing,
  topic,
  paused,
  onPause,
  onResume,
  onStop,
  onContinue,
  onUserFeedback,
  roundPauseMode,
  onSetRoundPauseMode,
  embedded = false,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [filterAgentId, setFilterAgentId] = useState<string | null>(null)
  const [userInput, setUserInput] = useState('')
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll only when enabled
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent, autoScroll])

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setAutoScroll(isAtBottom)
  }

  // Show feedback input when paused or when a round ends
  const isStopped = !currentAgent && !isSummarizing && messages.length > 0 && paused
  const roundJustEnded = !currentAgent && !isSummarizing && messages.length > 0 &&
    messages[messages.length - 1]?.agent_id !== '__user__'

  // Auto-pause between rounds when roundPauseMode === 'always'
  const lastRoundRef = useRef(0)

  useEffect(() => {
    if (!currentAgent && messages.length > 0 && !paused && !isSummarizing) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.agent_id !== '__user__' && lastMsg.round > lastRoundRef.current) {
        lastRoundRef.current = lastMsg.round
        if (lastMsg.round >= totalRounds) return

        if (roundPauseMode === 'always') {
          onPause()
          setShowFeedbackInput(true)
        }
      }
    }
  }, [messages, currentAgent, paused, isSummarizing, roundPauseMode, totalRounds, onPause])

  useEffect(() => {
    if (isStopped || (roundJustEnded && paused)) {
      setShowFeedbackInput(true)
    }
  }, [isStopped, roundJustEnded, paused])

  const getAgent = (id: string) => agents.find(a => a.id === id)

  const handleSubmitFeedback = () => {
    if (!userInput.trim()) return
    onUserFeedback(userInput.trim())
    setUserInput('')
    setShowFeedbackInput(false)
  }

  const handleAgentFilter = (agentId: string) => {
    setFilterAgentId(prev => prev === agentId ? null : agentId)
  }

  // Filter messages based on selected agent
  const filteredMessages = filterAgentId
    ? messages.filter(m => m.agent_id === filterAgentId || m.agent_id === '__user__')
    : messages

  const isRunning = currentAgent !== null || (streamingContent.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[70vh]"
    >
      {/* Left: Agent Orbit + Controls */}
      <div className="lg:col-span-1">
        <div className="glass-card p-6 sticky top-24 space-y-5">
          {/* Topic */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">讨论主题</div>
            <p className="text-sm text-gray-300 line-clamp-3">{topic}</p>
          </div>

          {/* Agent Orbit - clickable for filtering */}
          <AgentOrbit
            agents={agents}
            currentAgent={currentAgent}
            messages={messages}
            onAgentClick={handleAgentFilter}
            filterAgentId={filterAgentId}
          />

          {/* Filter indicator */}
          {filterAgentId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-xs text-indigo-400">
                筛选: {getAgent(filterAgentId)?.avatar} {getAgent(filterAgentId)?.name}
              </span>
              <button
                onClick={() => setFilterAgentId(null)}
                className="ml-auto text-[10px] text-gray-500 hover:text-gray-300"
              >
                清除
              </button>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>讨论进度</span>
              <span>第 {currentRound} / {totalRounds} 轮</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(currentRound / totalRounds) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {isSummarizing ? (
              <>
                <Loader2 size={14} className="animate-spin text-purple-400" />
                <span className="text-xs text-purple-400">正在生成架构方案...</span>
              </>
            ) : paused ? (
              <>
                <Pause size={12} className="text-yellow-400" />
                <span className="text-xs text-yellow-400">已暂停</span>
              </>
            ) : currentAgent ? (
              <>
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                <span className="text-xs text-gray-400">
                  {getAgent(currentAgent)?.avatar} {getAgent(currentAgent)?.name} 正在发言...
                </span>
              </>
            ) : messages.length > 0 && !isSummarizing && !embedded ? (
              <>
                <Square size={12} className="text-gray-500" />
                <span className="text-xs text-gray-500">已停止</span>
              </>
            ) : messages.length > 0 && !isSummarizing && embedded ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-green-400">步骤完成</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs text-gray-400">讨论进行中</span>
              </>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {isRunning && !paused && (
              <button
                onClick={onPause}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs hover:bg-yellow-500/20 transition-colors"
              >
                <Pause size={12} />
                暂停
              </button>
            )}
            {paused && (
              <button
                onClick={onResume}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-colors"
              >
                <Play size={12} />
                继续
              </button>
            )}
            {(isRunning || paused) && (
              <button
                onClick={onStop}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
              >
                <Square size={12} />
                停止
              </button>
            )}
            {!embedded && !isRunning && !paused && messages.length > 0 && !isSummarizing && (
              <button
                onClick={onContinue}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs hover:bg-indigo-500/20 transition-colors"
              >
                <Play size={12} />
                继续讨论
              </button>
            )}
            {/* Live toggle: pause between rounds */}
            {onSetRoundPauseMode && (
              <button
                onClick={() => onSetRoundPauseMode(roundPauseMode === 'always' ? 'none' : 'always')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors ${
                  roundPauseMode === 'always'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                }`}
                title={roundPauseMode === 'always' ? '当前：每轮暂停等待反馈，点击关闭' : '当前：自动继续，点击开启每轮暂停'}
              >
                {roundPauseMode === 'always' ? <Bell size={12} /> : <BellOff size={12} />}
                {roundPauseMode === 'always' ? '等待反馈' : '自动'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Message Stream */}
      <div
        className="lg:col-span-2 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {/* Scroll to bottom button */}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true)
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="sticky top-2 z-10 ml-auto block px-3 py-1.5 rounded-full bg-indigo-600/90 text-white text-xs shadow-lg hover:bg-indigo-500 transition-colors"
          >
            ↓ 回到底部
          </button>
        )}

        {/* Round indicator */}
        {currentRound > 0 && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
              第 {currentRound} 轮讨论开始
            </span>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {filteredMessages.map((msg, index) => {
            const isUser = msg.agent_id === '__user__'
            const agent = isUser ? null : getAgent(msg.agent_id)

            // Show round separator
            const prevMsg = filteredMessages[index - 1]
            const showRoundSep = index > 0 && prevMsg && prevMsg.round !== msg.round && !isUser

            return (
              <div key={`${msg.agent_id}-${msg.round}-${index}`}>
                {showRoundSep && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-500">第 {msg.round} 轮</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                {isUser ? (
                  <UserFeedbackBubble content={msg.content} />
                ) : agent ? (
                  <MessageBubble agent={agent} message={msg} index={index} />
                ) : null}
              </div>
            )
          })}
        </AnimatePresence>

        {/* Streaming message */}
        {currentAgent && streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MessageBubble
              agent={getAgent(currentAgent)!}
              message={{
                agent_id: currentAgent,
                agent_name: getAgent(currentAgent)?.name || '',
                round: currentRound,
                content: streamingContent,
                timestamp: Date.now(),
              }}
              index={messages.length}
              isStreaming
            />
          </motion.div>
        )}

        {/* User feedback input area */}
        {!embedded && (showFeedbackInput || paused || (!isRunning && messages.length > 0 && !isSummarizing)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">💬 给Agent们的反馈（可选）</span>
              <RatingStars />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmitFeedback()}
                placeholder="输入你的意见、方向调整或评价..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
              />
              <button
                onClick={handleSubmitFeedback}
                disabled={!userInput.trim()}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Summarizing indicator */}
        {isSummarizing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center space-y-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="w-16 h-16 mx-auto rounded-full border-2 border-purple-500/30 border-t-purple-500 flex items-center justify-center"
            >
              <span className="text-2xl">📝</span>
            </motion.div>
            <div>
              <p className="text-gray-300 font-medium">正在整合各方观点</p>
              <p className="text-gray-500 text-sm mt-1">生成最终架构设计方案...</p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </motion.div>
  )
}

// ============ Rating Stars ============

function RatingStars() {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-0.5 ml-auto">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5"
        >
          <Star
            size={14}
            className={`transition-colors ${
              star <= (hovered || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className="text-[10px] text-gray-500 ml-1">{rating}/5</span>
      )}
    </div>
  )
}

// ============ User Feedback Bubble ============

function UserFeedbackBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 border-l-4 border-indigo-500/50 bg-indigo-500/5"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-indigo-500/20">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-indigo-400">用户反馈</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{content}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ============ Message Bubble ============

/**
 * MessageBubble is wrapped in React.memo so that already-completed
 * messages don't re-render every time `streamingContent` changes for
 * the in-flight message. Without this, a flow with many messages would
 * pay an O(N) re-render + LiteMarkdown re-parse cost ~60 times per
 * second while one agent is speaking and bring the page to a halt.
 *
 * Custom equality: compare message content + isStreaming flag.
 */
const MessageBubble = memo(function MessageBubble({
  agent,
  message,
  index,
  isStreaming = false,
}: {
  agent: Agent
  message: Message
  index: number
  isStreaming?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: isStreaming ? 0 : index * 0.05, duration: 0.3 }}
      className="glass-card p-4 hover:bg-white/[0.07] transition-colors"
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: agent.color + '20' }}
          animate={isStreaming ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {agent.avatar}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm" style={{ color: agent.color }}>
              {agent.name}
            </span>
            <span className="text-xs text-gray-600">R{message.round}</span>
            {isStreaming && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-xs text-green-400"
              >
                ● 发言中
              </motion.span>
            )}

            {!isStreaming && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {collapsed ? (
                  <>
                    <ChevronRight size={12} />
                    <span>展开</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} />
                    <span>折叠</span>
                  </>
                )}
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {collapsed ? (
              <motion.p
                key="collapsed"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-gray-500 italic truncate"
              >
                {message.content.slice(0, 80)}...
              </motion.p>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={isStreaming ? 'typing-cursor' : ''}
              >
                <LiteMarkdown content={message.content} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
})
