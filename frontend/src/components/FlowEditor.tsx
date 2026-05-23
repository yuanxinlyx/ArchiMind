import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Save, ArrowUp, ArrowDown, GitBranch, List } from 'lucide-react'
import type { FlowDefinition, FlowStep, Provider } from '../types'
import { validateFlowDefinition } from '../utils/flowValidator'
import { FlowDAG } from './FlowDAG'

interface Props {
  open: boolean
  onClose: () => void
  flow?: FlowDefinition
  onSave: (flow: FlowDefinition) => void
  providers?: Provider[]
}

export function FlowEditor({ open, onClose, flow, onSave, providers = [] }: Props) {
  const [view, setView] = useState<'list' | 'dag'>('list')
  const [name, setName] = useState(flow?.name || '')
  const [description, setDescription] = useState(flow?.description || '')
  const [steps, setSteps] = useState<FlowStep[]>(flow?.steps || [])
  const [errors, setErrors] = useState<string[]>([])

  // Reset editor state when a different flow is loaded
  useEffect(() => {
    setName(flow?.name || '')
    setDescription(flow?.description || '')
    setSteps(flow?.steps ? flow.steps.map(s => ({ ...s })) : [])
    setErrors([])
  }, [flow])

  const addStep = () => {
    setSteps([...steps, {
      id: `step-${Date.now()}`,
      topic: '',
      // rounds left undefined = use the global rounds from SetupPanel
      dependencies: [],
      module: '',
    }])
  }

  const updateStep = (index: number, updates: Partial<FlowStep>) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, ...updates } : s))
  }

  const removeStep = (index: number) => {
    const removedId = steps[index].id
    setSteps(steps.filter((_, i) => i !== index).map(s => ({
      ...s,
      dependencies: s.dependencies.filter(d => d !== removedId),
    })))
  }

  const moveStep = (from: number, to: number) => {
    const newSteps = [...steps]
    const [moved] = newSteps.splice(from, 1)
    newSteps.splice(to, 0, moved)
    setSteps(newSteps)
  }

  const handleSave = () => {
    const flowDef: FlowDefinition = {
      id: flow?.id || `flow-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      steps,
      createdAt: flow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    const validationErrors = validateFlowDefinition(flowDef)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map(e => e.message))
      return
    }

    setErrors([])
    onSave(flowDef)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[85vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100">{flow ? '编辑讨论流' : '创建讨论流'}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">流程名称 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="例如：微服务架构设计流"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">描述</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="可选描述"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Steps header with view toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">步骤 ({steps.length})</label>
                    <div className="flex gap-0.5 p-0.5 rounded-md bg-white/5 border border-white/10">
                      <button
                        onClick={() => setView('list')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                          view === 'list' ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-500 hover:text-gray-300'
                        }`}
                        title="列表视图"
                      >
                        <List size={10} />
                        列表
                      </button>
                      <button
                        onClick={() => setView('dag')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                          view === 'dag' ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-500 hover:text-gray-300'
                        }`}
                        title="依赖图"
                      >
                        <GitBranch size={10} />
                        DAG
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs hover:bg-indigo-500/20"
                  >
                    <Plus size={10} />
                    添加步骤
                  </button>
                </div>

                {view === 'dag' ? (
                  <FlowDAG steps={steps} />
                ) : (
                  <>
                    {steps.map((step, i) => (
                      <div key={step.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 w-5">{i + 1}</span>
                          <input
                            type="text"
                            value={step.topic}
                            onChange={e => updateStep(i, { topic: e.target.value })}
                            placeholder="讨论主题..."
                            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                          />
                          <input
                            type="number"
                            value={step.rounds ?? ''}
                            onChange={e => {
                              const raw = e.target.value
                              if (raw === '') {
                                updateStep(i, { rounds: undefined })
                              } else {
                                const n = parseInt(raw)
                                updateStep(i, { rounds: isNaN(n) ? undefined : Math.max(1, n) })
                              }
                            }}
                            placeholder="全局"
                            className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-100 text-center placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                            min={1}
                            title="每步轮次（留空使用全局设置）"
                          />
                          <span className="text-[9px] text-gray-600">R</span>
                          <div className="flex gap-0.5">
                            <button onClick={() => i > 0 && moveStep(i, i - 1)} disabled={i === 0} className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30">
                              <ArrowUp size={11} />
                            </button>
                            <button onClick={() => i < steps.length - 1 && moveStep(i, i + 1)} disabled={i === steps.length - 1} className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30">
                              <ArrowDown size={11} />
                            </button>
                            <button onClick={() => removeStep(i)} className="p-1 text-red-500/60 hover:text-red-400">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={step.module || ''}
                            onChange={e => updateStep(i, { module: e.target.value })}
                            placeholder="模块分组（可选）"
                            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-400 placeholder-gray-700 focus:outline-none focus:border-indigo-500/50"
                          />
                          {providers.length > 0 && (
                            <select
                              value={step.providerId || ''}
                              onChange={e => updateStep(i, { providerId: e.target.value || undefined })}
                              title="步骤专用模型（优先级低于 Agent 自身设置）"
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-400 focus:outline-none focus:border-indigo-500/50"
                            >
                              <option value="" className="bg-gray-900">默认模型</option>
                              {providers.filter(p => p.apiKey).map(p => (
                                <option key={p.id} value={p.id} className="bg-gray-900">
                                  {p.name} · {p.model}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {/* Dependencies multi-select */}
                        {i > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-600 shrink-0">依赖:</span>
                            {steps.slice(0, i).map(prev => {
                              const isDepSelected = step.dependencies.includes(prev.id)
                              return (
                                <button
                                  key={prev.id}
                                  type="button"
                                  onClick={() => {
                                    const newDeps = isDepSelected
                                      ? step.dependencies.filter(d => d !== prev.id)
                                      : [...step.dependencies, prev.id]
                                    updateStep(i, { dependencies: newDeps })
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                                    isDepSelected
                                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                      : 'bg-white/5 border-white/10 text-gray-600 hover:text-gray-400'
                                  }`}
                                >
                                  {prev.topic ? prev.topic.slice(0, 15) + (prev.topic.length > 15 ? '...' : '') : prev.id}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                    {steps.length === 0 && (
                      <p className="text-center text-xs text-gray-600 py-6">点击“添加步骤”开始构建你的讨论流</p>
                    )}
                  </>
                )}
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400">{err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/10 px-6 py-4 flex gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:bg-white/10">
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
              >
                <Save size={14} />
                {flow ? '保存修改' : '创建流程'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
