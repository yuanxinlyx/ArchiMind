# ArchiMind - 多智能体架构设计系统

[English](./README_EN.md)

> 让多个 AI Agent 从不同专业视角展开多轮讨论，协作打磨出高质量的架构设计方案。

<p align="center">
  <img src="./docs/images/archimind-home.png" alt="ArchiMind 首页演示" width="900" />
</p>

## 功能亮点

- **多角色协作** — 自定义 Agent 角色（架构师、安全专家、DBA、性能工程师等），每个角色带有独立 System Prompt 和立场（中立/挑战/支持）
- **两种讨论模式** — 环形讨论（Ring）适合快速头脑风暴；流程讨论（Flow）按步骤推进，支持步骤间依赖和并行执行
- **内置专业流程** — 默认 8 步架构设计工作坊：需求分析 → 容量估算 → 高层设计 → 数据/接口/安全并行 → 部署运维 → 方案输出
- **流程可编辑** — 内置流程支持克隆为自定义版本，自由调整步骤、轮次、依赖关系和模块分组
- **多 Provider 支持** — 同时配置多个 LLM 供应商（OpenAI、DeepSeek、Gemini、OpenRouter、SiliconFlow、Ollama 等），支持按 Agent 或按步骤指定 Provider
- **Token 可控** — 每个 Provider 可独立配置 `maxTokens`，精确控制单次回复长度
- **实时流式输出** — 基于 SSE 的实时讨论可视化，支持暂停/继续/中止
- **架构文档生成** — 讨论结束后自动生成结构化 Markdown 架构设计文档，含 Mermaid 图表
- **历史记录** — 自动保存讨论记录，支持查看回顾和基于历史追加讨论

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Tailwind CSS + Framer Motion + Vite |
| 后端 | Python FastAPI + SSE (Server-Sent Events) |
| AI | OpenAI-compatible API（支持任何兼容 `/v1/chat/completions` 的服务） |

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- 至少一个 LLM API Key

### 一键启动（Windows）

```bash
start.bat
```

### 手动启动

**后端：**
```bash
cd backend
pip install -r requirements.txt
# 可选：创建 .env 文件配置默认 API Key
# OPENAI_API_KEY=your-key
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4
python main.py
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

启动后访问 http://localhost:5173

## 使用指南

1. **配置 Provider** — 点击设置图标，添加 LLM 供应商并填入 API Key
2. **选择/编辑 Agent** — 配置参与讨论的专家角色，可调整立场和绑定 Provider
3. **输入主题** — 描述你的项目想法或技术需求
4. **选择模式** — Ring 模式快速讨论 / Flow 模式按流程推进
5. **开始讨论** — 观看 Agent 实时讨论，可随时暂停或追加反馈
6. **获取成果** — 讨论结束后自动生成完整架构设计文档

## 项目结构

```
├── backend/
│   ├── main.py           # FastAPI 主服务 + Ring 讨论引擎
│   ├── flow_engine.py    # Flow 讨论引擎
│   ├── shared.py         # 共享模型和工具函数
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 应用入口
│   │   ├── components/          # UI 组件
│   │   ├── data/defaultFlow.ts  # 内置流程定义
│   │   ├── types.ts             # 类型定义
│   │   └── utils/               # 工具函数
│   └── package.json
├── start.bat             # Windows 一键启动
└── README.md
```

## 许可证

MIT
