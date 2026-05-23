export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  isCustom?: boolean;
}

/**
 * Discussion stance for an agent.
 *  - 'neutral'  : default behaviour (cooperative reasoning)
 *  - 'support'  : tends to build on prior arguments
 *  - 'challenge': required to surface counter-points / hidden risks
 */
export type AgentStance = 'neutral' | 'support' | 'challenge';

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  system_prompt: string;
  color: string;
  providerId?: string; // which provider this agent uses (empty = default)
  stance?: AgentStance; // discussion stance, default 'neutral'
}

/** Token usage reported by the LLM provider for a single completion. */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface Message {
  agent_id: string;
  agent_name: string;
  round: number;
  content: string;
  timestamp: number;
  usage?: TokenUsage;
}

export interface DiscussionConfig {
  topic: string;
  agents: Agent[];
  rounds: number;
  language: string;
}

export type DiscussionStatus = 'idle' | 'discussing' | 'summarizing' | 'done';

// 'none' = no pause between rounds, 'always' = always wait for user input
export type RoundPauseMode = 'none' | 'always';

export interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

// Keep for backward compat, maps to default provider
export interface ApiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// ============ Discussion Flow Types ============

export type DiscussionMode = 'ring' | 'flow';

export interface FlowStep {
  id: string;
  topic: string;
  /**
   * Per-step rounds override. When undefined, the global rounds setting
   * from SetupPanel is used as fallback at flow start.
   */
  rounds?: number;
  dependencies: string[]; // step IDs this step depends on
  module?: string;        // grouping label
  /**
   * Per-step provider override. Resolution order at runtime:
   *   agent.providerId  >  step.providerId  >  config.default_provider_id
   * Useful to use a stronger model on harder steps and a cheaper one on
   * trivial steps.
   */
  providerId?: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped';

export interface StepContext {
  stepId: string;
  topic: string;
  rounds: number;
  agents: string[];
  summary: string;
  completedAt: number;
}

export interface FlowSession {
  flowId: string;
  flowDefinition: FlowDefinition;
  currentStepIndex: number;
  stepStatuses: StepStatus[];
  stepContexts: StepContext[];
  userFeedbacks: Record<string, string>; // stepId -> feedback
  startedAt: number;
  status: 'running' | 'paused' | 'completed';
}

// ============ History ============

export interface HistoryRecord {
  id: string;
  topic: string;
  mode: DiscussionMode;
  agents: { name: string; avatar: string; color: string }[];
  summary: string;
  messages: Message[];
  flowName?: string;
  createdAt: number;
  totalTokens?: number;
  summaryUsage?: TokenUsage;
}

// ============ Resumable Session ============

/**
 * Snapshot of an in-progress discussion that gets persisted to localStorage,
 * so the user can recover after a tab close / network drop.
 *
 * For ring mode we store the flat message log; for flow mode we additionally
 * store the resolved FlowDefinition and the per-step status / context arrays.
 */
export interface ResumableRingSession {
  kind: 'ring';
  topic: string;
  agents: Agent[];
  rounds: number;
  messages: Message[];
  startedAt: number;
  updatedAt: number;
}

export interface ResumableFlowSession {
  kind: 'flow';
  topic: string;
  agents: Agent[];
  flow: FlowDefinition;
  currentStepIndex: number;
  stepStatuses: StepStatus[];
  stepContexts: StepContext[];
  userFeedbacks: Record<string, string>;
  /** Messages from the currently-running step (cleared between steps). */
  currentStepMessages: Message[];
  startedAt: number;
  updatedAt: number;
}

export type ResumableSession = ResumableRingSession | ResumableFlowSession;
