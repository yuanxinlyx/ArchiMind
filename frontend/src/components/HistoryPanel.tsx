import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Clock, Eye } from 'lucide-react'
import type { HistoryRecord } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  records: HistoryRecord[]
  onDelete: (id: string) => void
  onClearAll: () => void
  onView: (record: HistoryRecord) => void
}

export function HistoryPanel({ open, onClose, records, onDelete, onClearAll, onView }: Props) {
  const [confirmClear, setConfirmClear] = useState(false)

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
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
            initial={{ opacity: 0, x: -400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-[101] w-full max-w-md bg-gray-900 border-r border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-100">历史记录</h2>
                <span className="text-xs text-gray-500">({records.length})</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {records.length === 0 && (
                <div className="text-center py-12">
                  <Clock size={32} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500">还没有讨论记录</p>
                  <p className="text-xs text-gray-600 mt-1">完成一次讨论后会自动保存</p>
                </div>
              )}

              {records.map(record => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Agent avatars */}
                    <div className="flex -space-x-1.5 shrink-0">
                      {record.agents.slice(0, 3).map((a, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs border border-gray-800"
                          style={{ backgroundColor: a.color + '30' }}
                        >
                          {a.avatar}
                        </div>
                      ))}
                      {record.agents.length > 3 && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] text-gray-500 bg-gray-800 border border-gray-700">
                          +{record.agents.length - 3}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 line-clamp-2">{record.topic}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-gray-500">{formatDate(record.createdAt)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          record.mode === 'flow'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {record.mode === 'flow' ? record.flowName || '讨论流' : '讨论环'}
                        </span>
                        <span className="text-[10px] text-gray-600">{record.messages.length} 条消息</span>
                        {record.totalTokens !== undefined && record.totalTokens > 0 && (
                          <span className="text-[10px] text-gray-600">· {record.totalTokens.toLocaleString()} tokens</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => onView(record)}
                        className="w-7 h-7 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center hover:bg-indigo-500/20 transition-colors"
                        title="查看"
                      >
                        <Eye size={12} className="text-indigo-400" />
                      </button>
                      <button
                        onClick={() => onDelete(record.id)}
                        className="w-7 h-7 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {record.summary && (
                    <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {record.summary.replace(/[#*`]/g, '').slice(0, 120)}...
                    </p>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            {records.length > 0 && (
              <div className="shrink-0 border-t border-white/10 px-6 py-3">
                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">确认清空所有记录？</span>
                    <button
                      onClick={() => { onClearAll(); setConfirmClear(false) }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-xs text-white hover:bg-red-500"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    清空所有记录
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
