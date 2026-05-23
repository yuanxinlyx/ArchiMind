import type { FlowDefinition } from '../types'

export const DEFAULT_FLOW: FlowDefinition = {
  id: 'default-architecture-workshop',
  name: '架构设计工作坊',
  description: '专业架构设计流程：需求分析 → 容量估算 → 高层设计 → 数据/接口/安全并行深入 → 部署运维 → 最终方案输出。',
  isDefault: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  steps: [
    // Phase 1: Discovery
    {
      id: 'requirements',
      topic: '需求分析与约束定义：明确项目的核心功能需求、非功能性需求（延迟、吞吐、可用性 SLA）、技术约束（预算、团队规模、上线时间）、已有技术栈和依赖。输出需求优先级矩阵。',
      dependencies: [],
      module: '需求发现',
    },
    {
      id: 'estimation',
      topic: '容量估算与瓶颈预判：基于需求做信封背面计算——DAU、峰值 QPS、存储增长率、带宽需求。识别系统的读写比例和热点数据，预判最可能的性能瓶颈（CPU / IO / 网络 / 锁竞争）。',
      dependencies: ['requirements'],
      module: '需求发现',
    },

    // Phase 2: High-Level Design
    {
      id: 'architecture',
      topic: '高层架构设计：基于需求和容量估算，进行服务拆分与模块边界定义。确定通信模式（同步 RPC / 异步消息 / 事件驱动），画出核心组件关系图（C4 Context + Container 级别），明确各模块职责。',
      dependencies: ['estimation'],
      module: '架构设计',
    },

    // Phase 3: Deep-Dive (parallel tracks)
    {
      id: 'data-design',
      topic: '数据架构设计：根据数据特征选择存储方案（关系型 / 文档 / KV / 列存 / 时序），设计核心数据模型、索引策略、分片与分区方案。讨论一致性模型（强一致 / 最终一致）和缓存策略。',
      dependencies: ['architecture'],
      module: '深入设计',
    },
    {
      id: 'api-design',
      topic: 'API 与接口设计：定义核心 API 契约（RESTful / gRPC / GraphQL），设计鉴权流程（JWT / OAuth2），规划版本策略和限流方案。讨论前后端通信、第三方集成、WebSocket 等实时通信需求。',
      dependencies: ['architecture'],
      module: '深入设计',
    },
    {
      id: 'reliability-security',
      topic: '可靠性与安全设计：容错策略（熔断、降级、超时、重试、幂等），安全威胁建模（STRIDE），认证授权架构（最小权限原则），数据加密（传输 + 静态），合规性要求（GDPR 等）。设计故障恢复 RTO/RPO 目标。',
      dependencies: ['data-design', 'api-design'],
      module: '深入设计',
    },

    // Phase 4: Operations & Finalization
    {
      id: 'deployment-ops',
      topic: '部署与运维方案：CI/CD 流水线设计，容器编排与基础设施选型（K8s / Serverless / 混合），可观测性方案（Logs / Metrics / Traces 三件套），扩缩容策略，灰度发布与回滚机制。给出成本估算。',
      dependencies: ['reliability-security'],
      module: '部署运维',
    },
    {
      id: 'final-document',
      topic: '最终架构方案输出：综合前面所有步骤的讨论成果，输出完整的架构设计文档。包括：架构总览图、核心模块说明、技术选型理由、数据流图、部署架构图、开发路线图（MVP → V1 → V2），以及关键架构决策记录（ADR）。',
      rounds: 3,
      dependencies: ['deployment-ops'],
      module: '方案输出',
    },
  ],
}
