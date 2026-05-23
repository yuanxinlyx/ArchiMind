import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Minus, Sparkles, MessageSquare, Pencil, Trash2, Copy, Workflow, RotateCw, BookOpen } from 'lucide-react'
import type { Agent, Provider, RoundPauseMode, DiscussionMode, FlowDefinition } from '../types'
import { AgentEditor } from './AgentEditor'
import { FlowEditor } from './FlowEditor'
import { AgentTemplatePicker } from './AgentTemplatePicker'
import { DEFAULT_FLOW } from '../data/defaultFlow'

interface Props {
  agents: Agent[]
  setAgents: (agents: Agent[]) => void
  allAgents: Agent[]
  setAllAgents: (agents: Agent[]) => void
  topic: string
  setTopic: (topic: string) => void
  rounds: number
  setRounds: (rounds: number) => void
  onStart: () => void
  providers: Provider[]
  defaultProviderId: string
  summaryProviderId: string
  setSummaryProviderId: (id: string) => void
  roundPauseMode: RoundPauseMode
  setRoundPauseMode: (mode: RoundPauseMode) => void
  mode: DiscussionMode
  setMode: (mode: DiscussionMode) => void
  selectedFlow: FlowDefinition
  setSelectedFlow: (flow: FlowDefinition) => void
  customFlows: FlowDefinition[]
  setCustomFlows: (flows: FlowDefinition[]) => void
}

export function SetupPanel({
  agents,
  setAgents,
  allAgents,
  setAllAgents,
  topic,
  setTopic,
  rounds,
  setRounds,
  onStart,
  providers,
  defaultProviderId,
  summaryProviderId,
  setSummaryProviderId,
  roundPauseMode,
  setRoundPauseMode,
  mode,
  setMode,
  selectedFlow,
  setSelectedFlow,
  customFlows,
  setCustomFlows,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [flowEditorOpen, setFlowEditorOpen] = useState(false)
  const [editingFlow, setEditingFlow] = useState<FlowDefinition | undefined>(undefined)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const toggleAgent = (agent: Agent) => {
    const exists = agents.find(a => a.id === agent.id)
    if (exists) {
      setAgents(agents.filter(a => a.id !== agent.id))
    } else {
      setAgents([...agents, agent])
    }
  }

  const isSelected = (id: string) => agents.some(a => a.id === id)

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setEditorOpen(true)
  }

  const handleCreateAgent = () => {
    setEditingAgent(null)
    setEditorOpen(true)
  }

  const handleDuplicateAgent = (agent: Agent) => {
    const newAgent: Agent = {
      ...agent,
      id: `${agent.id}-copy-${Date.now()}`,
      name: `${agent.name} (副本)`,
    }
    setAllAgents([...allAgents, newAgent])
  }

  const handleDeleteAgent = (agent: Agent) => {
    setAllAgents(allAgents.filter(a => a.id !== agent.id))
    setAgents(agents.filter(a => a.id !== agent.id))
  }

  const handleSaveAgent = (savedAgent: Agent) => {
    if (editingAgent) {
      // Update existing
      setAllAgents(allAgents.map(a => a.id === editingAgent.id ? savedAgent : a))
      setAgents(agents.map(a => a.id === editingAgent.id ? savedAgent : a))
    } else {
      // Create new
      setAllAgents([...allAgents, savedAgent])
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm"
          >
            <Sparkles size={16} />
            <span>AI驱动的架构设计</span>
          </motion.div>
          <h2 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              多Agent协作
            </span>
            <br />
            <span className="text-gray-200">打磨你的架构设计</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            选择不同角色的AI专家，输入你的想法，让他们从各自的专业角度讨论并生成完整的架构方案。
          </p>
        </div>

        {/* Topic Input */}
        <div className="glass-card p-6 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <MessageSquare size={16} className="text-indigo-400" />
            项目想法 / 需求描述
          </label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="例如：我想做一个支持百万用户的实时协作文档编辑器，类似Google Docs..."
            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-all"
          />
        </div>

        {/* Mode Toggle */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-300">讨论模式</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('ring')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                mode === 'ring'
                  ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <RotateCw size={16} />
              <div className="text-left">
                <div className="text-sm font-medium">讨论环</div>
                <div className="text-[10px] opacity-60">单主题 N 轮讨论</div>
              </div>
            </button>
            <button
              onClick={() => setMode('flow')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                mode === 'flow'
                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Workflow size={16} />
              <div className="text-left">
                <div className="text-sm font-medium">讨论流</div>
                <div className="text-[10px] opacity-60">多步骤结构化管线</div>
              </div>
            </button>
          </div>
        </div>

        {/* Flow Picker (only in flow mode) */}
        {mode === 'flow' && (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">选择讨论流</h3>
              <button
                onClick={() => { setEditingFlow(undefined); setFlowEditorOpen(true) }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs hover:bg-purple-500/20"
              >
                <Plus size={10} />
                自定义
              </button>
            </div>

            {/* Default flow */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFlow(DEFAULT_FLOW)}
                className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                  selectedFlow.id === DEFAULT_FLOW.id
                    ? 'bg-purple-500/10 border-purple-500/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{DEFAULT_FLOW.name}</div>
                    <div className="text-[10px] text-gray-500">{DEFAULT_FLOW.steps.length} 步骤 · {DEFAULT_FLOW.description}</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  const clone: FlowDefinition = {
                    ...DEFAULT_FLOW,
                    id: `flow-${Date.now()}`,
                    name: `${DEFAULT_FLOW.name} (自定义)`,
                    isDefault: undefined,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  }
                  setEditingFlow(clone)
                  setFlowEditorOpen(true)
                }}
                className="px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-500"
                title="基于此模板创建自定义讨论流"
              >
                <Copy size={12} />
              </button>
            </div>

            {/* Custom flows */}
            {customFlows.map(f => (
              <div key={f.id} className="flex gap-2">
                <button
                  onClick={() => setSelectedFlow(f)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                    selectedFlow.id === f.id
                      ? 'bg-purple-500/10 border-purple-500/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-200">{f.name}</div>
                  <div className="text-[10px] text-gray-500">{f.steps.length} 步骤</div>
                </button>
                <button
                  onClick={() => { setEditingFlow(f); setFlowEditorOpen(true) }}
                  className="px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-500"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => setCustomFlows(customFlows.filter(cf => cf.id !== f.id))}
                  className="px-2 rounded-lg bg-white/5 border border-red-500/20 hover:bg-red-500/10 text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Agent Selection with CRUD */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">参与讨论的专家</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTemplatePickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs hover:bg-purple-500/20 transition-colors"
                title="从预置模板库创建 Agent"
              >
                <BookOpen size={12} />
                从模板
              </button>
              <button
                onClick={handleCreateAgent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs hover:bg-indigo-500/20 transition-colors"
              >
                <Plus size={12} />
                新建 Agent
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative group p-4 rounded-xl border text-left transition-all duration-300 ${
                  isSelected(agent.id)
                    ? 'bg-white/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                }`}
              >
                {/* Selection click area */}
                <button
                  onClick={() => toggleAgent(agent)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{agent.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-200 truncate">{agent.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{agent.role}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                        isSelected(agent.id)
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-gray-600'
                      }`}
                    >
                      {isSelected(agent.id) && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 text-white"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M10 3L4.5 8.5 2 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        </motion.svg>
                      )}
                    </div>
                  </div>
                </button>

                {/* Action buttons - show on hover */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDuplicateAgent(agent) }}
                    className="w-6 h-6 rounded-md bg-gray-800/90 border border-white/10 flex items-center justify-center hover:bg-gray-700 transition-colors"
                    title="复制"
                  >
                    <Copy size={11} className="text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditAgent(agent) }}
                    className="w-6 h-6 rounded-md bg-gray-800/90 border border-white/10 flex items-center justify-center hover:bg-gray-700 transition-colors"
                    title="编辑"
                  >
                    <Pencil size={11} className="text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent) }}
                    className="w-6 h-6 rounded-md bg-gray-800/90 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={11} className="text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {agents.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">发言顺序(拖动调整)</span>
                <span className="text-[10px] text-gray-600">{agents.length} 位专家</span>
              </div>
              <div className="space-y-1.5">
                {agents.map((agent, i) => (
                  <div
                    key={agent.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); (e.currentTarget as HTMLElement).classList.add('opacity-50') }}
                    onDragEnd={(e) => { (e.currentTarget as HTMLElement).classList.remove('opacity-50') }}
                    onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('border-indigo-500/50') }}
                    onDragLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove('border-indigo-500/50') }}
                    onDrop={(e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).classList.remove('border-indigo-500/50')
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                      if (isNaN(fromIndex) || fromIndex === i) return
                      const newAgents = [...agents]
                      const [moved] = newAgents.splice(fromIndex, 1)
                      newAgents.splice(i, 0, moved)
                      setAgents(newAgents)
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 cursor-grab active:cursor-grabbing transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="text-[10px] text-gray-600 w-4 text-center font-mono">{i + 1}</span>
                    <span className="text-base">{agent.avatar}</span>
                    <span className="text-xs text-gray-300 flex-1 truncate">{agent.name}</span>
                    <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4h2v2H4V4zm6 0h2v2h-2V4zM4 7h2v2H4V7zm6 0h2v2h-2V7zm-6 3h2v2H4v-2zm6 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rounds Setting */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-300">
                {mode === 'ring' ? '讨论轮次' : '默认每步轮次'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {mode === 'ring' ? '更多轮次 = 更深入的讨论，但耗时更长' : '仅对未自定义轮次的步骤生效；已在流程中设置的步骤轮次会被优先使用'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRounds(Math.max(1, rounds - 1))}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-2xl font-bold text-indigo-400 w-8 text-center">{rounds}</span>
              <button
                onClick={() => setRounds(Math.min(10, rounds + 1))}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Round Pause Mode — simple toggle */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-300">
                {mode === 'ring' ? '每轮结束后等待反馈' : '每步骤完成后等待反馈'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {roundPauseMode === 'always'
                  ? '每轮结束后暂停，等待你输入反馈后再继续。'
                  : '讨论将不间断进行，结束后统一生成方案。'}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">讨论过程中可随时切换</p>
            </div>
            <button
              onClick={() => setRoundPauseMode(roundPauseMode === 'always' ? 'none' : 'always')}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                roundPauseMode === 'always' ? 'bg-indigo-600' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  roundPauseMode === 'always' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Summary Provider */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">最终方案生成使用的模型</h3>
          <select
            value={summaryProviderId}
            onChange={e => setSummaryProviderId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm appearance-none"
          >
            <option value="" className="bg-gray-900">使用默认渠道</option>
            {providers.filter(p => p.apiKey).map(p => (
              <option key={p.id} value={p.id} className="bg-gray-900">
                {p.name} — {p.model}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600">
            最终整合方案需要较强的模型能力，建议选择旗舰模型。
          </p>
        </div>

        {/* Start Button */}
        {(() => {
          const hasProvider = providers.some(p => p.apiKey)
          const flowTotalRounds = selectedFlow.steps.reduce((sum, s) => sum + (s.rounds ?? rounds), 0)
          const flowCalls = flowTotalRounds * agents.length
          const ringCalls = rounds * agents.length
          const disabled = !topic.trim() || agents.length === 0 || !hasProvider
          const disabledReason = !hasProvider
            ? '请先在设置中配置至少一个带 API Key 的 Provider'
            : !topic.trim()
              ? '请填写项目想法'
              : agents.length === 0
                ? '请选择至少一位专家'
                : ''
          return (
            <div className="space-y-2">
              <motion.button
                onClick={onStart}
                disabled={disabled}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
                title={disabled ? undefined : '快捷键：Ctrl+Enter'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={20} />
                  {mode === 'ring'
                    ? `开始讨论 (${agents.length} 位专家 × ${rounds} 轮 ≈ ${ringCalls} 次调用)`
                    : `开始讨论流 (${selectedFlow.steps.length} 步骤 ≈ ${flowCalls} 次调用)`
                  }
                </span>
              </motion.button>
              {disabledReason && (
                <p className="text-xs text-amber-400/80 text-center">{disabledReason}</p>
              )}
            </div>
          )
        })()}
      </motion.div>

      {/* Agent Editor Modal */}
      <AgentEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        agent={editingAgent}
        onSave={handleSaveAgent}
        providers={providers}
        defaultProviderId={defaultProviderId}
      />

      {/* Flow Editor Modal */}
      <FlowEditor
        open={flowEditorOpen}
        onClose={() => setFlowEditorOpen(false)}
        flow={editingFlow}
        providers={providers}
        onSave={(flow) => {
          if (editingFlow) {
            setCustomFlows(customFlows.map(f => f.id === editingFlow.id ? flow : f))
          } else {
            setCustomFlows([...customFlows, flow])
          }
          setSelectedFlow(flow)
        }}
      />

      {/* Agent Template Picker Modal */}
      <AgentTemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        existingIds={allAgents.map(a => a.id)}
        onPick={(agent) => {
          setAllAgents([...allAgents, agent])
          setAgents([...agents, agent])
        }}
      />
    </>
  )
}
