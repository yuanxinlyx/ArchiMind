import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { FileText, MessageSquare, Download, Copy, Check, BarChart3 } from 'lucide-react'
import type { Agent, Message } from '../types'
import { CodeBlock } from './CodeBlock'

interface Props {
  summary: string
  messages: Message[]
  agents: Agent[]
  topic: string
}

/** Build a fully-detailed Markdown report bundling topic / agents / token stats / discussion / summary. */
function buildFullReport(topic: string, agents: Agent[], messages: Message[], summary: string): string {
  const lines: string[] = []
  lines.push(`# 架构设计讨论报告`)
  lines.push('')
  lines.push(`**生成时间**: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push(`## 主题\n\n${topic}`)
  lines.push('')
  lines.push(`## 参与专家\n`)
  for (const a of agents) {
    lines.push(`- ${a.avatar} **${a.name}** — ${a.role}`)
  }
  lines.push('')

  // Token stats (only if any usage data exists)
  const totals = messages.reduce(
    (acc, m) => ({
      prompt: acc.prompt + (m.usage?.prompt ?? 0),
      completion: acc.completion + (m.usage?.completion ?? 0),
      total: acc.total + (m.usage?.total ?? 0),
    }),
    { prompt: 0, completion: 0, total: 0 },
  )
  if (totals.total > 0) {
    lines.push(`## Token 用量\n`)
    lines.push(`- 输入: ${totals.prompt.toLocaleString()}`)
    lines.push(`- 输出: ${totals.completion.toLocaleString()}`)
    lines.push(`- **合计**: ${totals.total.toLocaleString()}`)
    lines.push('')
  }

  // Per-round discussion
  lines.push(`## 讨论记录\n`)
  let lastRound = -1
  for (const m of messages) {
    if (m.round !== lastRound) {
      lines.push('')
      lines.push(`### 第 ${m.round} 轮`)
      lastRound = m.round
    }
    const tokenInfo = m.usage ? ` _(${m.usage.total} tokens)_` : ''
    lines.push('')
    lines.push(`#### ${m.agent_name}${tokenInfo}`)
    lines.push('')
    lines.push(m.content)
  }
  lines.push('')

  // Final summary
  lines.push(`## 最终架构方案\n`)
  lines.push(summary)
  lines.push('')

  return lines.join('\n')
}

export function SummaryView({ summary, messages, agents, topic }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary')
  const [copiedKind, setCopiedKind] = useState<'summary' | 'full' | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  const getAgent = (id: string) => agents.find(a => a.id === id)

  const tokenStats = useMemo(() => {
    const byAgent: Record<string, { name: string; total: number; prompt: number; completion: number }> = {}
    let prompt = 0, completion = 0, total = 0
    for (const m of messages) {
      if (!m.usage) continue
      prompt += m.usage.prompt
      completion += m.usage.completion
      total += m.usage.total
      if (!byAgent[m.agent_id]) {
        byAgent[m.agent_id] = { name: m.agent_name, total: 0, prompt: 0, completion: 0 }
      }
      byAgent[m.agent_id].total += m.usage.total
      byAgent[m.agent_id].prompt += m.usage.prompt
      byAgent[m.agent_id].completion += m.usage.completion
    }
    return {
      prompt, completion, total,
      byAgent: Object.values(byAgent).sort((a, b) => b.total - a.total),
    }
  }, [messages])

  const flashCopied = (kind: 'summary' | 'full') => {
    setCopiedKind(kind)
    setTimeout(() => setCopiedKind(null), 1500)
  }

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      flashCopied('summary')
    } catch { /* ignore */ }
  }

  const copyFullReport = async () => {
    try {
      await navigator.clipboard.writeText(buildFullReport(topic, agents, messages, summary))
      flashCopied('full')
    } catch { /* ignore */ }
  }

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSummary = () => {
    downloadFile(summary, `architecture-${Date.now()}.md`, 'text/markdown')
  }

  const downloadFullReport = () => {
    downloadFile(
      buildFullReport(topic, agents, messages, summary),
      `architecture-full-${Date.now()}.md`,
      'text/markdown',
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">架构设计方案</h2>
          <p className="text-sm text-gray-500 mt-1">
            基于 {agents.length} 位专家的讨论生成
            {tokenStats.total > 0 && (
              <button
                onClick={() => setStatsOpen(s => !s)}
                className="ml-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <BarChart3 size={11} />
                {tokenStats.total.toLocaleString()} tokens
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copySummary}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
            title="复制最终方案"
          >
            {copiedKind === 'summary' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copiedKind === 'summary' ? '已复制' : '复制方案'}
          </button>
          <button
            onClick={copyFullReport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
            title="复制含讨论记录的完整报告"
          >
            {copiedKind === 'full' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copiedKind === 'full' ? '已复制' : '复制完整报告'}
          </button>
          <button
            onClick={downloadSummary}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
          >
            <Download size={14} />
            下载方案
          </button>
          <button
            onClick={downloadFullReport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm"
          >
            <Download size={14} />
            下载完整报告
          </button>
        </div>
      </div>

      {/* Token stats expanded */}
      {statsOpen && tokenStats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Token 用量明细</span>
            <div className="flex gap-4">
              <span>输入: <span className="text-gray-200">{tokenStats.prompt.toLocaleString()}</span></span>
              <span>输出: <span className="text-gray-200">{tokenStats.completion.toLocaleString()}</span></span>
              <span>合计: <span className="text-indigo-400 font-medium">{tokenStats.total.toLocaleString()}</span></span>
            </div>
          </div>
          <div className="space-y-1 pt-2 border-t border-white/5">
            {tokenStats.byAgent.map((a) => {
              const pct = (a.total / tokenStats.total) * 100
              return (
                <div key={a.name} className="flex items-center gap-3 text-xs">
                  <span className="w-32 truncate text-gray-300">{a.name}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right text-gray-400">{a.total.toLocaleString()}</span>
                  <span className="w-10 text-right text-gray-600">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText size={14} />
          架构方案
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageSquare size={14} />
          讨论记录 ({messages.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'summary' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8"
        >
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-gray-200 prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-transparent prose-pre:p-0">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }: {
                  inline?: boolean
                  className?: string
                  children?: React.ReactNode
                }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const lang = match ? match[1] : ''
                  if (inline) {
                    return <code className={className} {...props}>{children}</code>
                  }
                  return <CodeBlock code={String(children ?? '').replace(/\n$/, '')} lang={lang} />
                },
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {/* Topic */}
          <div className="glass-card p-4 border-l-4 border-indigo-500">
            <div className="text-xs text-gray-500 mb-1">讨论主题</div>
            <p className="text-sm text-gray-300">{topic}</p>
          </div>

          {/* Messages */}
          {messages.map((msg, index) => {
            const agent = getAgent(msg.agent_id)
            if (!agent) return null

            const showRoundSep = index > 0 && messages[index - 1].round !== msg.round

            return (
              <div key={index}>
                {showRoundSep && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-500 px-2">第 {msg.round} 轮</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                <div className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: agent.color + '20' }}
                    >
                      {agent.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" style={{ color: agent.color }}>
                          {agent.name}
                        </span>
                        <span className="text-[10px] text-gray-600">第{msg.round}轮</span>
                        {msg.usage && (
                          <span className="text-[10px] text-gray-600">· {msg.usage.total} tokens</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
