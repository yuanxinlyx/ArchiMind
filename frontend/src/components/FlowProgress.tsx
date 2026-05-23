import { motion } from 'framer-motion'
import { Check, Play, SkipForward, Clock, RotateCw } from 'lucide-react'
import type { FlowStep, StepStatus, StepContext } from '../types'

interface Props {
  steps: FlowStep[]
  currentStepIndex: number
  stepStatuses: StepStatus[]
  stepContexts: StepContext[]
  onStepClick: (index: number) => void
  /** When provided, completed steps show a hover Retry button. */
  onRetryStep?: (index: number) => void
  /** Disable the retry control while a step is currently executing. */
  canRetry?: boolean
}

export function FlowProgress({ steps, currentStepIndex, stepStatuses, stepContexts, onStepClick, onRetryStep, canRetry = true }: Props) {
  // Group steps by module
  const modules = new Map<string, { steps: FlowStep[]; indices: number[] }>()
  steps.forEach((step, i) => {
    const mod = step.module || '\u672a\u5206\u7ec4'
    if (!modules.has(mod)) modules.set(mod, { steps: [], indices: [] })
    modules.get(mod)!.steps.push(step)
    modules.get(mod)!.indices.push(i)
  })

  const getStatusIcon = (status: StepStatus, _index: number) => {
    switch (status) {
      case 'completed': return <Check size={10} className="text-green-400" />
      case 'running': return <Play size={8} className="text-indigo-400" />
      case 'skipped': return <SkipForward size={10} className="text-gray-500" />
      default: return <Clock size={9} className="text-gray-600" />
    }
  }

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-500/20'
      case 'running': return 'border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500/30'
      case 'skipped': return 'border-gray-600 bg-gray-600/10'
      default: return 'border-white/10 bg-white/5'
    }
  }

  return (
    <div className="space-y-4">
      {Array.from(modules.entries()).map(([moduleName, { steps: modSteps, indices }]) => (
        <div key={moduleName} className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium px-1">
            {moduleName}
          </div>
          <div className="space-y-1">
            {modSteps.map((step, mi) => {
              const globalIndex = indices[mi]
              const status = stepStatuses[globalIndex] || 'pending'
              const context = stepContexts.find(c => c.stepId === step.id)

              const showRetry = onRetryStep && (status === 'completed' || status === 'skipped')
              return (
                <motion.div
                  key={step.id}
                  className={`group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${getStatusColor(status)} hover:bg-white/[0.08]`}
                  whileHover={{ x: 2 }}
                  title={context?.summary || step.topic}
                >
                  <button
                    onClick={() => onStepClick(globalIndex)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${getStatusColor(status)}`}>
                      {getStatusIcon(status, globalIndex)}
                    </div>
                    <span className={`text-[11px] truncate flex-1 ${
                      status === 'completed' ? 'text-gray-400' :
                      status === 'running' ? 'text-indigo-300 font-medium' :
                      status === 'skipped' ? 'text-gray-600 line-through' :
                      'text-gray-500'
                    }`}>
                      {step.topic.slice(0, 30)}{step.topic.length > 30 ? '...' : ''}
                    </span>
                  </button>
                  <span className="text-[9px] text-gray-600 shrink-0">{step.rounds ?? '\u00b7'}R</span>
                  {showRetry && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (canRetry) onRetryStep!(globalIndex) }}
                      disabled={!canRetry}
                      title={canRetry ? '\u91cd\u8dd1\u6b64\u6b65\u9aa4\uff08\u540e\u7eed\u6b65\u9aa4\u4f1a\u91cd\u7f6e\uff09' : '\u8fd0\u884c\u4e2d\u4e0d\u80fd\u91cd\u8dd1'}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-500 hover:text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <RotateCw size={10} />
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Overall progress */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>{stepStatuses.filter(s => s === 'completed').length}/{steps.length} \u5b8c\u6210</span>
          <span>\u6b65\u9aa4 {currentStepIndex + 1}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-indigo-500 rounded-full"
            animate={{ width: `${(stepStatuses.filter(s => s === 'completed').length / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  )
}
