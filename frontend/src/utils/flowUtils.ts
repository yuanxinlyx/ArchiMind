import type { FlowStep, StepContext, StepStatus } from '../types'

/**
 * Resolve which step contexts to inject for a given step.
 * If step has explicit dependencies, only include those.
 * Otherwise include all prior completed contexts.
 */
export function resolveStepContext(
  step: FlowStep,
  allContexts: StepContext[],
  _stepStatuses: StepStatus[],
  allSteps: FlowStep[],
): StepContext[] {
  if (step.dependencies.length > 0) {
    // Only include explicitly declared dependencies (that are completed)
    return allContexts.filter(ctx =>
      step.dependencies.includes(ctx.stepId)
    )
  }

  // No explicit dependencies: include all prior completed step contexts
  const stepIndex = allSteps.findIndex(s => s.id === step.id)
  const priorStepIds = allSteps.slice(0, stepIndex).map(s => s.id)

  return allContexts.filter(ctx =>
    priorStepIds.includes(ctx.stepId)
  )
}

/**
 * Estimate remaining time in seconds.
 * Assumes ~30 seconds per agent per round.
 */
export function estimateRemainingTime(
  pendingSteps: FlowStep[],
  agentCount: number,
  secondsPerAgentRound: number = 30,
): number {
  return pendingSteps.reduce((total, step) => {
    return total + (step.rounds ?? 2) * agentCount * secondsPerAgentRound
  }, 0)
}

/**
 * Reorder remaining steps. Returns new array with same elements in new order.
 */
export function reorderSteps(steps: FlowStep[], fromIndex: number, toIndex: number): FlowStep[] {
  const result = [...steps]
  const [moved] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, moved)
  return result
}

/**
 * Format context for injection into agent prompts.
 * Respects a max character budget.
 */
export function formatContextForPrompt(
  contexts: StepContext[],
  userFeedbacks: Record<string, string>,
  maxChars: number = 4000,
): string {
  const parts: string[] = []

  for (const ctx of contexts) {
    parts.push(`[\u6b65\u9aa4: ${ctx.topic}]\n${ctx.summary}`)
    const feedback = userFeedbacks[ctx.stepId]
    if (feedback) {
      parts.push(`[\u7528\u6237\u53cd\u9988]: ${feedback}`)
    }
  }

  let result = parts.join('\n\n')
  if (result.length > maxChars) {
    // Truncate from the beginning (keep most recent context)
    result = '...\n' + result.slice(result.length - maxChars + 4)
  }
  return result
}
