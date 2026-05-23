import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Save, Plus, Trash2, RefreshCw, Check, ChevronDown } from 'lucide-react'
import type { Provider } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  providers: Provider[]
  onSaveProviders: (providers: Provider[]) => void
  defaultProviderId: string
  onSetDefaultProvider: (id: string) => void
}

// Preset provider templates (no API key)
const PRESET_TEMPLATES: Omit<Provider, 'apiKey'>[] = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.5-flash' },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' },
  { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.com/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { id: 'together', name: 'Together AI', baseUrl: 'https://api.together.ai/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-auto' },
  { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  { id: 'ollama', name: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
]

export function SettingsPanel({ open, onClose, providers, onSaveProviders, defaultProviderId, onSetDefaultProvider }: Props) {
  const [localProviders, setLocalProviders] = useState<Provider[]>(providers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fetchingModels, setFetchingModels] = useState<string | null>(null)
  const [modelOptions, setModelOptions] = useState<Record<string, string[]>>({})
  const [showModelDropdown, setShowModelDropdown] = useState<string | null>(null)

  const handleSave = () => {
    onSaveProviders(localProviders)
    onClose()
  }

  const addPreset = (template: Omit<Provider, 'apiKey'>) => {
    // Check if already exists
    if (localProviders.some(p => p.id === template.id)) {
      setEditingId(template.id)
      return
    }
    const newProvider: Provider = { ...template, apiKey: '' }
    setLocalProviders([...localProviders, newProvider])
    setEditingId(template.id)
  }

  const addCustomProvider = () => {
    const id = `custom-${Date.now()}`
    const newProvider: Provider = {
      id,
      name: '自定义渠道',
      baseUrl: '',
      apiKey: '',
      model: '',
      isCustom: true,
    }
    setLocalProviders([...localProviders, newProvider])
    setEditingId(id)
  }

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setLocalProviders(localProviders.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const removeProvider = (id: string) => {
    setLocalProviders(localProviders.filter(p => p.id !== id))
    if (editingId === id) setEditingId(null)
    if (defaultProviderId === id) onSetDefaultProvider('')
  }

  const fetchModels = async (provider: Provider) => {
    if (!provider.baseUrl) return
    setFetchingModels(provider.id)
    try {
      const response = await fetch('/api/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setModelOptions(prev => ({ ...prev, [provider.id]: data.models }))
        setShowModelDropdown(provider.id)
      }
    } catch {
      // silently fail
    } finally {
      setFetchingModels(null)
    }
  }

  const selectModel = (providerId: string, model: string) => {
    updateProvider(providerId, { model })
    setShowModelDropdown(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-xl bg-gray-900 border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100">API 设置</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick add presets */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">添加服务商</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TEMPLATES.map(t => {
                    const exists = localProviders.some(p => p.id === t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => addPreset(t)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                          exists
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {exists && <Check size={10} className="inline mr-1" />}
                        {t.name}
                      </button>
                    )
                  })}
                  <button
                    onClick={addCustomProvider}
                    className="px-2.5 py-1.5 rounded-lg text-xs border border-dashed border-white/20 text-gray-400 hover:bg-white/5 hover:border-white/30 transition-colors flex items-center gap-1"
                  >
                    <Plus size={10} />
                    自定义
                  </button>
                </div>
              </div>

              {/* Provider list */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">已配置的渠道</label>
                {localProviders.length === 0 && (
                  <p className="text-xs text-gray-600 py-4 text-center">点击上方按钮添加服务商</p>
                )}
                {localProviders.map(provider => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    isEditing={editingId === provider.id}
                    isDefault={defaultProviderId === provider.id}
                    onToggleEdit={() => setEditingId(editingId === provider.id ? null : provider.id)}
                    onUpdate={(updates) => updateProvider(provider.id, updates)}
                    onRemove={() => removeProvider(provider.id)}
                    onSetDefault={() => onSetDefaultProvider(provider.id)}
                    onFetchModels={() => fetchModels(provider)}
                    fetchingModels={fetchingModels === provider.id}
                    modelOptions={modelOptions[provider.id] || []}
                    showModelDropdown={showModelDropdown === provider.id}
                    onSelectModel={(model) => selectModel(provider.id, model)}
                    onCloseDropdown={() => setShowModelDropdown(null)}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/10 px-6 py-4">
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium"
              >
                <Save size={14} />
                保存设置
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============ Provider Card ============

function ProviderCard({
  provider,
  isEditing,
  isDefault,
  onToggleEdit,
  onUpdate,
  onRemove,
  onSetDefault,
  onFetchModels,
  fetchingModels,
  modelOptions,
  showModelDropdown,
  onSelectModel,
  onCloseDropdown,
}: {
  provider: Provider
  isEditing: boolean
  isDefault: boolean
  onToggleEdit: () => void
  onUpdate: (updates: Partial<Provider>) => void
  onRemove: () => void
  onSetDefault: () => void
  onFetchModels: () => void
  fetchingModels: boolean
  modelOptions: string[]
  showModelDropdown: boolean
  onSelectModel: (model: string) => void
  onCloseDropdown: () => void
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className={`rounded-xl border transition-colors ${isEditing ? 'bg-white/[0.06] border-indigo-500/30' : 'bg-white/[0.03] border-white/10'}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggleEdit}
      >
        <div className={`w-2 h-2 rounded-full ${provider.apiKey ? 'bg-green-400' : 'bg-gray-600'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200 truncate">
              {provider.name}
            </span>
            {isDefault && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                默认
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-500 truncate block">{provider.model || '未选择模型'}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
              {/* Name (editable for custom) */}
              {provider.isCustom && (
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">渠道名称</label>
                  <input
                    type="text"
                    value={provider.name}
                    onChange={e => onUpdate({ name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              )}

              {/* Base URL */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">Base URL</label>
                <input
                  type="text"
                  value={provider.baseUrl}
                  onChange={e => onUpdate({ baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-xs"
                />
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={provider.apiKey}
                    onChange={e => onUpdate({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-xs"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* Model with fetch */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">模型</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={provider.model}
                      onChange={e => onUpdate({ model: e.target.value })}
                      placeholder="模型名称"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    {/* Model dropdown */}
                    {showModelDropdown && modelOptions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {modelOptions.map(model => (
                          <button
                            key={model}
                            onClick={() => onSelectModel(model)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-colors truncate"
                          >
                            {model}
                          </button>
                        ))}
                        <button
                          onClick={onCloseDropdown}
                          className="w-full text-center px-3 py-1.5 text-[10px] text-gray-500 hover:bg-white/5 border-t border-white/5"
                        >
                          关闭
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onFetchModels}
                    disabled={fetchingModels || !provider.baseUrl}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-gray-400 disabled:opacity-40 shrink-0 flex items-center gap-1"
                    title="获取模型列表"
                  >
                    <RefreshCw size={12} className={fetchingModels ? 'animate-spin' : ''} />
                    获取
                  </button>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">单次回复最大 Tokens</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={provider.maxTokens ?? ''}
                    onChange={e => {
                      const raw = e.target.value
                      if (raw === '') {
                        onUpdate({ maxTokens: undefined })
                      } else {
                        const n = parseInt(raw)
                        if (!isNaN(n)) onUpdate({ maxTokens: n })
                      }
                    }}
                    onBlur={() => {
                      if (provider.maxTokens != null) {
                        onUpdate({ maxTokens: Math.max(100, Math.min(16000, provider.maxTokens)) })
                      }
                    }}
                    placeholder="默认 800"
                    className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                    min={100}
                    max={16000}
                  />
                  <span className="text-[10px] text-gray-600">留空使用默认值（普通轮 800 / 末轮 1200）</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {!isDefault && (
                  <button
                    onClick={onSetDefault}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                  >
                    设为默认
                  </button>
                )}
                <button
                  onClick={onRemove}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ml-auto flex items-center gap-1"
                >
                  <Trash2 size={10} />
                  删除
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
