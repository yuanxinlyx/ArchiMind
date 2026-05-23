/**
 * FlowDAG - lightweight SVG dependency graph for a flow definition.
 *
 * No external graph library — we layer steps by longest-path depth from
 * sources and lay them out left-to-right.  Edges are drawn as cubic
 * Bezier paths between node anchor points.
 */
import { useMemo } from 'react'
import type { FlowStep, StepStatus } from '../types'

interface Props {
  steps: FlowStep[]
  /** Optional per-step status, used to color nodes during execution. */
  stepStatuses?: StepStatus[]
  /** Optional click handler. */
  onStepClick?: (stepIndex: number) => void
  /** Highlight the step currently being executed. */
  currentStepIndex?: number
}

interface LaidOutNode {
  step: FlowStep
  index: number
  layer: number
  row: number
  x: number
  y: number
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 56
const COL_GAP = 80
const ROW_GAP = 24

function computeLayout(steps: FlowStep[]): LaidOutNode[] {
  // Map step.id → original index for fast lookup
  const indexById = new Map<string, number>()
  steps.forEach((s, i) => indexById.set(s.id, i))

  // Layer = longest-path depth from any source (no-deps) step.
  // Cycle-safe: cap iterations at steps.length.
  const layers = new Array<number>(steps.length).fill(0)
  for (let pass = 0; pass < steps.length; pass++) {
    let changed = false
    for (let i = 0; i < steps.length; i++) {
      let maxDepLayer = -1
      for (const dep of steps[i].dependencies || []) {
        const di = indexById.get(dep)
        if (di !== undefined) maxDepLayer = Math.max(maxDepLayer, layers[di])
      }
      const newLayer = maxDepLayer + 1
      if (newLayer > layers[i]) {
        layers[i] = newLayer
        changed = true
      }
    }
    if (!changed) break
  }

  // Group steps by layer, preserving original order within a layer
  const byLayer = new Map<number, number[]>()
  for (let i = 0; i < steps.length; i++) {
    const l = layers[i]
    if (!byLayer.has(l)) byLayer.set(l, [])
    byLayer.get(l)!.push(i)
  }

  const nodes: LaidOutNode[] = []
  for (const [layer, indices] of byLayer.entries()) {
    indices.forEach((stepIdx, row) => {
      nodes.push({
        step: steps[stepIdx],
        index: stepIdx,
        layer,
        row,
        x: layer * (NODE_WIDTH + COL_GAP),
        y: row * (NODE_HEIGHT + ROW_GAP),
      })
    })
  }
  return nodes
}

function statusColor(status: StepStatus | undefined, isCurrent: boolean): { stroke: string; fill: string; text: string } {
  if (isCurrent) return { stroke: '#6366f1', fill: 'rgba(99,102,241,0.18)', text: '#c7d2fe' }
  switch (status) {
    case 'completed': return { stroke: '#22c55e', fill: 'rgba(34,197,94,0.12)', text: '#bbf7d0' }
    case 'running': return { stroke: '#6366f1', fill: 'rgba(99,102,241,0.18)', text: '#c7d2fe' }
    case 'skipped': return { stroke: '#6b7280', fill: 'rgba(107,114,128,0.08)', text: '#9ca3af' }
    default: return { stroke: 'rgba(255,255,255,0.15)', fill: 'rgba(255,255,255,0.04)', text: '#d1d5db' }
  }
}

export function FlowDAG({ steps, stepStatuses, onStepClick, currentStepIndex }: Props) {
  const nodes = useMemo(() => computeLayout(steps), [steps])
  const nodesByIndex = useMemo(() => {
    const m = new Map<number, LaidOutNode>()
    nodes.forEach(n => m.set(n.index, n))
    return m
  }, [nodes])

  if (steps.length === 0) {
    return (
      <div className="text-center text-xs text-gray-600 py-8">
        {'\u8fd8\u6ca1\u6709\u6b65\u9aa4\u53ef\u5c55\u793a'}
      </div>
    )
  }

  // Compute SVG canvas size
  const maxLayer = Math.max(0, ...nodes.map(n => n.layer))
  const maxRow = Math.max(0, ...nodes.map(n => n.row))
  const width = (maxLayer + 1) * NODE_WIDTH + maxLayer * COL_GAP + 4
  const height = (maxRow + 1) * NODE_HEIGHT + maxRow * ROW_GAP + 4

  // Edges: dep → step
  const edges: { fromIdx: number; toIdx: number }[] = []
  steps.forEach((step, i) => {
    for (const dep of step.dependencies || []) {
      const fromIdx = steps.findIndex(s => s.id === dep)
      if (fromIdx >= 0) edges.push({ fromIdx, toIdx: i })
    }
  })

  return (
    <div className="overflow-auto rounded-lg bg-black/20 border border-white/5 p-3">
      <svg width={width} height={height} className="block">
        <defs>
          <marker
            id="dag-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, ei) => {
          const a = nodesByIndex.get(e.fromIdx)
          const b = nodesByIndex.get(e.toIdx)
          if (!a || !b) return null
          const x1 = a.x + NODE_WIDTH
          const y1 = a.y + NODE_HEIGHT / 2
          const x2 = b.x
          const y2 = b.y + NODE_HEIGHT / 2
          const dx = Math.max(40, (x2 - x1) * 0.5)
          const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
          return (
            <path
              key={ei}
              d={path}
              fill="none"
              stroke="rgba(99,102,241,0.45)"
              strokeWidth={1.4}
              markerEnd="url(#dag-arrow)"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const status = stepStatuses?.[n.index]
          const isCurrent = currentStepIndex === n.index
          const c = statusColor(status, isCurrent)
          return (
            <g
              key={n.step.id}
              transform={`translate(${n.x}, ${n.y})`}
              className={onStepClick ? 'cursor-pointer' : ''}
              onClick={() => onStepClick?.(n.index)}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                ry={8}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text
                x={10}
                y={20}
                fill="#9ca3af"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {`#${n.index + 1}${n.step.module ? ` \u00b7 ${n.step.module}` : ''}`}
              </text>
              <text
                x={10}
                y={40}
                fill={c.text}
                fontSize={11}
                fontWeight={500}
              >
                {n.step.topic.length > 24
                  ? n.step.topic.slice(0, 24) + '\u2026'
                  : n.step.topic}
              </text>
              {(n.step.rounds !== undefined || n.step.providerId) && (
                <text
                  x={NODE_WIDTH - 10}
                  y={20}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  {n.step.rounds !== undefined ? `${n.step.rounds}R` : ''}
                  {n.step.providerId ? ' \u2022' : ''}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
