import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, SkipForward, Send, ArrowUp, ArrowDown } from 'lucide-react'
import type { FlowStep, StepContext } from '../types'

interface Props {
  completedStep: FlowStep
  completedContext: StepContext | null
  nextStep: FlowStep | null
  remainingSteps: FlowStep[]
  onContinue: () => void
  onSkip: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onFeedback: (text: string) => void
  /** Optional auto-advance countdown (seconds). null/undefined hides it. */
  countdown?: number | null
}

export function FlowStepCard({
  completedStep,
  completedContext,
  nextStep,
  remainingSteps,
  onContinue,
  onSkip,
  onReorder,
  onFeedback,
  countdown,
}: Props) {
  const [feedback, setFeedback] = useState('')
  const [showReorder, setShowReorder] = useState(false)

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) return
    onFeedback(feedback.trim())
    setFeedback('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 space-y-4"
    >
      {/* Completed step summary */}
      {completedContext && (
        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <span className="text-xs font-medium text-green-400">{'\u2705'} {completedStep.topic.slice(0, 40)}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{completedContext.summary}</p>
        </div>
      )}

      {/* Next step preview */}
      {nextStep && (
        <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{'\u4e0b\u4e00\u6b65'}</div>
          <p className="text-sm text-indigo-300">{nextStep.topic.slice(0, 60)}</p>
          <span className="text-[10px] text-gray-500 mt-1 block">{nextStep.rounds ?? 2} \u8f6e\u8ba8\u8bba {nextStep.module ? `\u00b7 ${nextStep.module}` : ''}</span>
        </div>
      )}

      {/* User feedback input */}
      <div className="space-y-2">
        <span className="text-xs text-gray-400">{'\ud83d\udcac'} \u7ed9\u4e0b\u4e00\u6b65\u7684\u53cd\u9988\uff08\u53ef\u9009\uff09</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmitFeedback()}
            placeholder={'\u8f93\u5165\u65b9\u5411\u8c03\u6574\u3001\u8865\u5145\u9700\u6c42...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            disabled={!feedback.trim()}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onContinue}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium"
        >
          <Play size={14} />
          {'\u7ee7\u7eed\u4e0b\u4e00\u6b65'}
          {typeof countdown === 'number' && countdown > 0 && (
            <span className="ml-1 text-xs text-indigo-200/80">
              ({countdown}s)
            </span>
          )}
        </button>
        {nextStep && (
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-gray-400"
          >
            <SkipForward size={12} />
            {'\u8df3\u8fc7'}
          </button>
        )}
        {remainingSteps.length > 1 && (
          <button
            onClick={() => setShowReorder(!showReorder)}
            className={`px-3 py-2.5 rounded-lg border text-xs transition-colors ${
              showReorder ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            {'\u8c03\u5e8f'}
          </button>
        )}
      </div>

      {/* Reorder panel */}
      {showReorder && remainingSteps.length > 1 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="space-y-1 pt-2 border-t border-white/5"
        >
          <span className="text-[10px] text-gray-500">{'\u62d6\u52a8\u8c03\u6574\u5269\u4f59\u6b65\u9aa4\u987a\u5e8f'}</span>
          {remainingSteps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-gray-600 w-4">{i + 1}</span>
              <span className="text-xs text-gray-400 flex-1 truncate">{step.topic.slice(0, 35)}</span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => i > 0 && onReorder(i, i - 1)}
                  disabled={i === 0}
                  className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30"
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  onClick={() => i < remainingSteps.length - 1 && onReorder(i, i + 1)}
                  disabled={i === remainingSteps.length - 1}
                  className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30"
                >
                  <ArrowDown size={10} />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
