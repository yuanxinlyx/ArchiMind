import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import type { Agent, AgentStance, Provider } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  agent: Agent | null  // null = create new
  onSave: (agent: Agent) => void
  providers: Provider[]
  defaultProviderId: string
}

const EMOJI_OPTIONS = ['🏗️', '🛡️', '⚡', '🚀', '📋', '🎨', '🔬', '📊', '🧪', '💡', '🔧', '🌐', '📱', '🤖', '🎯', '🧩']
const COLOR_OPTIONS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7']

export function AgentEditor({ open, onClose, agent, onSave, providers, defaultProviderId }: Props) {
  const [form, setForm] = useState<Agent>(
    agent || {
      id: `agent-${Date.now()}`,
      name: '',
      role: '',
      avatar: '🤖',
      color: '#6366f1',
      system_prompt: '',
      providerId: '',
    }
  )

  // Sync form state when agent prop changes (e.g. editing different agents)
  useEffect(() => {
    if (open) {
      setForm(
        agent || {
          id: `agent-${Date.now()}`,
          name: '',
          role: '',
          avatar: '🤖',
          color: '#6366f1',
          system_prompt: '',
          providerId: '',
        }
      )
    }
  }, [agent, open])

  const handleSave = () => {
    if (!form.name.trim() || !form.system_prompt.trim()) return
    const savedAgent = {
      ...form,
      id: form.id || `agent-${Date.now()}`,
    }
    onSave(savedAgent)
    onClose()
  }

  const getProviderLabel = (id: string) => {
    if (!id) return '使用默认'
    const p = providers.find(p => p.id === id)
    return p ? `${p.name} (${p.model})` : '使用默认'
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="agent-editor-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100">
                {agent ? '编辑 Agent' : '创建新 Agent'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: form.color + '20' }}
                >
                  {form.avatar}
                </div>
                <div>
                  <div className="font-medium" style={{ color: form.color }}>
                    {form.name || '未命名 Agent'}
                  </div>
                  <div className="text-sm text-gray-500">{form.role || '未设置角色'}</div>
                </div>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">头像</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setForm({ ...form, avatar: emoji })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        form.avatar === emoji
                          ? 'bg-indigo-500/20 border-2 border-indigo-500 scale-110'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">主题色</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：系统架构师"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">角色描述</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  placeholder="例如：System Architect"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                />
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">使用的 API 渠道</label>
                <select
                  value={form.providerId || ''}
                  onChange={e => setForm({ ...form, providerId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm appearance-none"
                >
                  <option value="" className="bg-gray-900">
                    使用默认 {defaultProviderId ? `(${getProviderLabel(defaultProviderId)})` : ''}
                  </option>
                  {providers.filter(p => p.apiKey).map(p => (
                    <option key={p.id} value={p.id} className="bg-gray-900">
                      {p.name} — {p.model}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600">
                  可以为每个Agent指定不同的模型，实现混合模型讨论。
                </p>
              </div>

              {/* Stance Selection (debate mode) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{'\u8ba8\u8bba\u7acb\u573a'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: 'neutral', label: '\u4e2d\u7acb', desc: '\u9ed8\u8ba4\u3001\u534f\u4f5c\u63a8\u7406', tone: 'gray' },
                    { v: 'support', label: '\u8865\u5145\u8005', desc: '\u8865\u5168\u3001\u5b8c\u5584\u3001\u52a0\u5f3a', tone: 'green' },
                    { v: 'challenge', label: '\u9b54\u9b3c\u4ee3\u8a00\u4eba', desc: '\u8d28\u7591\u3001\u627e\u76f2\u70b9\u3001\u53cd\u4f8b', tone: 'red' },
                  ] as { v: AgentStance; label: string; desc: string; tone: 'gray' | 'green' | 'red' }[]).map(opt => {
                    const active = (form.stance ?? 'neutral') === opt.v
                    const toneCls = active
                      ? opt.tone === 'red'
                        ? 'bg-red-500/15 border-red-500/50 text-red-300'
                        : opt.tone === 'green'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                          : 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    return (
                      <button
                        key={opt.v}
                        onClick={() => setForm({ ...form, stance: opt.v })}
                        className={`p-3 rounded-xl border text-left transition-all ${toneCls}`}
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-600">
                  {'\u201c\u9b54\u9b3c\u4ee3\u8a00\u4eba\u201d\u4f1a\u4e3b\u52a8\u8d28\u7591\u4e0a\u4e00\u4f4d\u53d1\u8a00\u8005\u7684\u6838\u5fc3\u5047\u8bbe\uff0c\u9002\u5408\u907f\u514d\u201c\u96c6\u4f53\u9644\u8bae\u201d\u3002'}
                </p>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">系统提示词 *</label>
                <textarea
                  value={form.system_prompt}
                  onChange={e => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="描述这个Agent的专业背景、职责和讨论风格..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-all text-sm leading-relaxed"
                />
                <p className="text-xs text-gray-600">
                  提示词决定了Agent在讨论中的表现。建议包含：专业背景、关注重点、讨论风格。
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-400"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim() || !form.system_prompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  {agent ? '保存修改' : '创建 Agent'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
