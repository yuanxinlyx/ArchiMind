/**
 * Modal that lets the user pick a pre-made agent template, instantiate
 * it with a fresh id, and add it to their agent collection.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import type { Agent } from '../types'
import { AGENT_CATEGORIES, templatesByCategory } from '../data/agentTemplates'

interface Props {
  open: boolean
  onClose: () => void
  /** Existing agent ids — used to skip duplicates. */
  existingIds: string[]
  /** Callback fired with a fully-formed Agent (id assigned). */
  onPick: (agent: Agent) => void
}

export function AgentTemplatePicker({ open, onClose, existingIds, onPick }: Props) {
  const grouped = templatesByCategory()

  const handlePick = (key: string) => {
    const tpl = Object.values(grouped).flat().find(t => t.key === key)
    if (!tpl) return
    let id = `${tpl.key}-${Date.now()}`
    // Ensure uniqueness
    while (existingIds.includes(id)) id = `${tpl.key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    onPick({ ...tpl.template, id })
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[85vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-100">{'\u4ece\u6a21\u677f\u521b\u5efa Agent'}</h2>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {AGENT_CATEGORIES.map(cat => {
                const list = grouped[cat] || []
                if (list.length === 0) return null
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{cat}</h3>
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[10px] text-gray-600">{list.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {list.map(tpl => {
                        const isStance = tpl.template.stance === 'challenge' || tpl.template.stance === 'support'
                        return (
                          <button
                            key={tpl.key}
                            onClick={() => handlePick(tpl.key)}
                            className="group relative p-3 rounded-xl bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.06] hover:border-white/20 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                                style={{ backgroundColor: tpl.template.color + '20' }}
                              >
                                {tpl.template.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-gray-200 truncate" style={{ color: tpl.template.color }}>
                                    {tpl.template.name}
                                  </span>
                                  {isStance && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                      tpl.template.stance === 'challenge'
                                        ? 'bg-red-500/15 text-red-300'
                                        : 'bg-emerald-500/15 text-emerald-300'
                                    }`}>
                                      {tpl.template.stance === 'challenge' ? '\u8d28\u7591\u5bf9\u624b' : '\u8865\u5145\u8005'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">{tpl.template.role}</div>
                                <div className="text-[10px] text-gray-600 mt-1 truncate">{tpl.tagline}</div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <p className="text-[10px] text-gray-600 text-center pt-2">
                {'\u9009\u4e2d\u6a21\u677f\u540e\u4f1a\u76f4\u63a5\u52a0\u5165\u4f60\u7684 Agent \u5217\u8868\uff0c\u4ecd\u53ef\u968f\u540e\u7f16\u8f91\u3002'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
