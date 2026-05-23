import type { FlowDefinition } from '../types'

export interface ValidationError {
  field: string
  message: string
}

export function validateFlowDefinition(flow: FlowDefinition): ValidationError[] {
  const errors: ValidationError[] = []

  if (!flow.name?.trim()) {
    errors.push({ field: 'name', message: '\u6d41\u7a0b\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a' })
  }

  if (!flow.steps || flow.steps.length === 0) {
    errors.push({ field: 'steps', message: '\u81f3\u5c11\u9700\u8981\u4e00\u4e2a\u6b65\u9aa4' })
    return errors
  }

  const stepIds = new Set<string>()
  const seenIds: string[] = []

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i]
    const prefix = `steps[${i}]`

    if (!step.id?.trim()) {
      errors.push({ field: `${prefix}.id`, message: `\u6b65\u9aa4 ${i + 1} \u7f3a\u5c11 ID` })
    } else if (stepIds.has(step.id)) {
      errors.push({ field: `${prefix}.id`, message: `\u6b65\u9aa4 ID "${step.id}" \u91cd\u590d` })
    } else {
      stepIds.add(step.id)
    }

    if (!step.topic?.trim()) {
      errors.push({ field: `${prefix}.topic`, message: `\u6b65\u9aa4 ${i + 1} \u7684\u4e3b\u9898\u4e0d\u80fd\u4e3a\u7a7a` })
    }

    // rounds is optional; only validate when explicitly set
    if (step.rounds !== undefined && step.rounds < 1) {
      errors.push({ field: `${prefix}.rounds`, message: `\u6b65\u9aa4 ${i + 1} \u7684\u8f6e\u6b21\u5fc5\u987b\u22651\u6216\u7559\u7a7a\u4f7f\u7528\u5168\u5c40\u8bbe\u7f6e` })
    }

    // Validate dependencies reference existing earlier steps
    if (step.dependencies) {
      for (const dep of step.dependencies) {
        if (!seenIds.includes(dep)) {
          errors.push({
            field: `${prefix}.dependencies`,
            message: `\u6b65\u9aa4 "${step.id}" \u4f9d\u8d56\u7684 "${dep}" \u4e0d\u5b58\u5728\u6216\u5728\u5f53\u524d\u6b65\u9aa4\u4e4b\u540e`,
          })
        }
      }
    }

    seenIds.push(step.id)
  }

  return errors
}
