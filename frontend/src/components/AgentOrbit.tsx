import { memo } from 'react'
import { motion } from 'framer-motion'
import type { Agent, Message } from '../types'

interface Props {
  agents: Agent[]
  currentAgent: string | null
  messages: Message[]
  onAgentClick?: (agentId: string) => void
  filterAgentId?: string | null
}

export const AgentOrbit = memo(function AgentOrbit({ agents, currentAgent, messages, onAgentClick, filterAgentId }: Props) {
  const centerX = 140
  const centerY = 140
  const radius = 90

  // Calculate positions in a circle
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }

  // Get message count per agent
  const getMessageCount = (agentId: string) =>
    messages.filter(m => m.agent_id === agentId).length

  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
        {/* Orbit ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Connection lines between agents */}
        {agents.map((agent, i) => {
          const pos1 = getPosition(i, agents.length)
          return agents.slice(i + 1).map((agent2, j) => {
            const pos2 = getPosition(i + j + 1, agents.length)
            const isActive = currentAgent === agent.id || currentAgent === agent2.id
            return (
              <motion.line
                key={`${agent.id}-${agent2.id}`}
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke={isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={isActive ? 1.5 : 0.5}
                className={isActive ? 'animated-line' : ''}
                animate={{
                  stroke: isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.05)',
                }}
              />
            )
          })
        })}

        {/* Center brain icon */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={20}
          fill="rgba(99, 102, 241, 0.1)"
          stroke="rgba(99, 102, 241, 0.3)"
          strokeWidth="1"
          animate={{
            scale: currentAgent ? [1, 1.1, 1] : 1,
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <text
          x={centerX}
          y={centerY + 6}
          textAnchor="middle"
          fontSize="16"
        >
          💡
        </text>
      </svg>

      {/* Agent nodes */}
      {agents.map((agent, index) => {
        const pos = getPosition(index, agents.length)
        const isActive = currentAgent === agent.id
        const msgCount = getMessageCount(agent.id)

        return (
          <motion.div
            key={agent.id}
            className="absolute"
            style={{
              left: pos.x - 24,
              top: pos.y - 24,
            }}
            animate={{
              scale: isActive ? 1.2 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {/* Glow effect when active */}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: agent.color }}
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}

            {/* Agent avatar */}
            <motion.div
              className="relative w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
              style={{
                backgroundColor: agent.color + '20',
                borderColor: isActive ? agent.color : filterAgentId === agent.id ? agent.color : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.1 }}
              onClick={() => onAgentClick?.(agent.id)}
              title={`${agent.name} (${msgCount} 条发言) - 点击筛选`}
            >
              {agent.avatar}

              {/* Message count badge */}
              {msgCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold"
                >
                  {msgCount}
                </motion.div>
              )}
            </motion.div>

            {/* Agent name */}
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[10px] text-gray-500">{agent.name}</span>
            </div>
          </motion.div>
        )
      })}

      {/* Pulse rings when discussion is active */}
      {currentAgent && (
        <>
          <motion.div
            className="absolute rounded-full border border-indigo-500/20"
            style={{
              left: centerX - 50,
              top: centerY - 50,
              width: 100,
              height: 100,
            }}
            animate={{
              scale: [1, 2],
              opacity: [0.3, 0],
            }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute rounded-full border border-purple-500/20"
            style={{
              left: centerX - 50,
              top: centerY - 50,
              width: 100,
              height: 100,
            }}
            animate={{
              scale: [1, 2],
              opacity: [0.3, 0],
            }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 1 }}
          />
        </>
      )}
    </div>
  )
})
