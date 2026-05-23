import { motion } from 'framer-motion'
import { History, X } from 'lucide-react'
import type { ResumableSession } from '../types'

interface Props {
  session: ResumableSession
  onResume: () => void
  onDismiss: () => void
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '\u521a\u521a'
  if (m < 60) return `${m} \u5206\u949f\u524d`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} \u5c0f\u65f6\u524d`
  return `${Math.floor(h / 24)} \u5929\u524d`
}

export function ResumeBanner({ session, onResume, onDismiss }: Props) {
  const meta =
    session.kind === 'ring'
      ? `${session.agents.length} \u4f4d\u4e13\u5bb6 \u00b7 ${session.messages.length} \u6761\u8bb0\u5f55`
      : `${session.flow.name} \u00b7 \u6b65\u9aa4 ${session.currentStepIndex + 1}/${session.flow.steps.length}`

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="glass-card p-4 border-l-4 border-amber-500 flex items-center gap-3"
    >
      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
        <History size={16} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200 font-medium">
          {'\u53d1\u73b0\u672a\u5b8c\u6210\u7684\u8ba8\u8bba'}
          <span className="ml-2 text-[10px] text-gray-500 font-normal">
            {session.kind === 'ring' ? '\u8ba8\u8bba\u73af' : '\u8ba8\u8bba\u6d41'} \u00b7 {formatRelative(session.updatedAt)}
          </span>
        </div>
        <div className="text-xs text-gray-400 truncate mt-0.5">{session.topic || '\uff08\u65e0\u4e3b\u9898\uff09'}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{meta}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onResume}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs hover:bg-amber-500/30"
        >
          {'\u7ee7\u7eed\u8ba8\u8bba'}
        </button>
        <button
          onClick={onDismiss}
          title={'\u5ffd\u7565\u5e76\u5220\u9664'}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-gray-400"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  )
}
