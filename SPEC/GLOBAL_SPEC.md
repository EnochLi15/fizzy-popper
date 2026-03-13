Symphony x OpenCode 智能调度看板系统规格设计说明书

## 1. 产品概述 (Product Overview)

**产品愿景**：打造下一代“AI 软件工厂”控制台。将工程团队的开发模式从“微观监督 AI 写代码（如 Cursor 模式）”升级为“宏观管理项目工作流（Symphony 模式）”。 **核心价值**：

1. **自动化任务流水线**：将日常 Issue 转化为独立运行的 Agent 任务。
2. **沉浸式可观测性**：通过高保真面板，实时掌控 AI 代理的思考、编码与测试过程。
3. **安全的人机协同 (HITL)**：在 AI 遇到阻塞或偏离预期时，允许人类开发者无缝介入并下发指令。

## 2. 系统架构 (System Architecture)

系统采用前后端分离，结合 SDK 中间件通信的架构设计：

- **前端展示层 (Vue 3 / TailwindCSS)**：
  - 负责 Kanban 视图渲染。
  - 负责 Agent 实时工作台（右侧抽屉）的流式渲染。
  - 采用 WebSocket 接收高频的 Agent 执行日志。
- **后端调度中心 (Node.js + Symphony Engine)**：
  - 作为看板数据和 AI 代理之间的枢纽。
  - 处理 Issue CRUD 及状态流转。
  - 对接 `@opencode-ai/sdk`，负责执行会话的管理和状态分发。
- **数据持久层 (Database & Storage)**：
  - **数据库 (Database)**：使用 **SQLite**。作为一款轻量级、零配置的嵌入式数据库，它完美契合本地化部署和极简架构的需求。现代 SQLite 同样支持处理灵活变动的 `agentConfig` (JSON) 等复杂执行结果，极大降低了系统的运维和部署成本。
  - **ORM (对象关系映射)**：推荐使用 **Prisma** 或 **Drizzle ORM**，它们对 SQLite 提供了完美的支持，并提供端到端的 TypeScript 类型安全，确保数据库模型与前后端交互接口的数据结构一致。
  - **缓存机制 (Optional)**：对于纯本地单机运行场景，可直接使用 Node.js 内存管理 WebSocket 状态；若有后续多实例扩展的需求，可引入 **Redis** 用于状态同步和调度锁。
- **AI 代理执行层 (OpenCode / 执行环境)**：
  - **环境配置选项**：支持按需选择代码执行环境：
    - **使用沙箱 (WebContainers)**：基于前端 WebAssembly 技术，在浏览器/客户端中提供极速启动（毫秒级）、完全隔离的纯前端 Node.js 运行环境。
    - **不使用沙箱 (本地/直连运行)**：在受信任的本地网络或开发机中直接运行，获得最高的文件读写权限和执行速度。
  - 由指定的 LLM (如 GPT-5.1 Codex / Claude 4.5 Sonnet) 驱动思考与工具调用 (Tool Use)。

## 3. 核心功能模块 (Core Modules)

### 3.1 增强型任务看板 (Kanban Board)

- **状态列定义**：待处理 (Todo) -> 开发中 (In Progress) -> 代码审查 (In Review) -> 已完成 (Done)。
- **AI 专属视觉标识**：分配给 AI 的卡片带有专有的 `🤖 Agent` 徽标。
- **实时状态脉冲**：当任务处于“开发中”时，卡片上显示动画脉冲及当前具体动作（如“Agent 正在编写代码”、“正在运行 CI”）。

### 3.2 Agent 实时监控台 (Agent Studio Panel)

作为从右侧滑出的全局抽屉，提供深度的可观测能力。包含三个核心 Tab：

1. **运行追踪 (Session)**：
   - **模拟终端**：渲染 SDK 推送的 `Reasoning` (思考) 和 `Tool_Calling` (终端命令执行) 日志。
   - **人工干预 (HITL)**：底部提供指令输入框，在 Agent 遇到 `Waiting_for_input` 状态时解锁，接收人类指令。
2. **变更结果 (Diff)**：
   - 任务结束后，结构化展示被修改的代码文件及 Git Diff 视图。
3. **Agent 配置 (Settings)**：
   - 展示该任务绑定的模型 (Model)、最大迭代次数、**沙箱运行模式 (启用 WebContainers / 不使用沙箱)** 以及工作区挂载状态。

### 3.3 全局操作与环境挂载

- **实时预览 (Live URL)**：若启用了 WebContainers 沙箱并暴露了 Web 服务（如 npm run dev），面板头部提供「工作区实时预览」按钮，点击新开页面访问动态生成的沙箱域名。
- **强制终止 (Kill Process)**：提供最高优先级的红框「强制停止任务」按钮，调用后端向 SDK 发送 `SIGTERM` 信号，立即销毁/清理执行进程或前端沙箱实例。

## 4. 任务生命周期与状态映射 (Lifecycle & State Machine)

前端看板状态与底层 `opencode-ai/sdk` 状态需严格映射：

| **看板状态 (Kanban)** | **SDK 运行状态 (Session State)** | **前端 UI 表现** | | Todo | `IDLE` | 静态卡片，等待指派或启动 | | In Progress | `INITIALIZING` | 卡片显示“分配工作区”，面板禁用输入 | | In Progress | `REASONING` | 卡片脉冲动画，面板终端输出思考流 | | In Progress | `TOOL_CALLING` | 卡片脉冲动画，面板终端输出代码/命令 | | In Progress | `WAITING_INPUT` | 卡片告警标识，面板输入框解锁要求人类干预 | | In Review | `COMPLETED` | 卡片移至 Review 列，展示 PR 链接，面板展示 Diff | | Done | `CLOSED` | 归档任务 |

## 5. 数据交互规约 (Data Interfaces)

### 5.1 Issue 数据结构 (Issue Model)

```
interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  assignee: 'human' | 'ai' | null;
  tags: string[];
  
  // --- AI 专属字段 ---
  agentStatus?: 'initializing' | 'writing_code' | 'waiting_input' | 'completed';
  workspaceUrl?: string; // e.g., "https://<webcontainer-id>.webcontainer.io" (仅启用沙箱时存在)
  startTime?: number; // 毫秒时间戳
  agentConfig?: {
    model: string; // e.g., "opencode/gpt-5.1-codex"
    maxIterations: number;
    useSandbox: boolean; // 是否启用 WebContainers 沙箱
    ciCommand?: string; // e.g., "npm run test"
  };
}
```

### 5.2 Agent 日志流事件 (WebSocket Stream Event)

后端通过 WebSocket 推送至前端的数据格式（此部分数据由内存/Redis流转，一般不落库或仅做归档）：

```
interface AgentStreamEvent {
  id: string; // 事件唯一 ID
  type: 'thought' | 'tool_call' | 'intervention_required' | 'system';
  content?: string; // 思考内容或系统消息
  command?: string; // 执行的 bash/mcp 命令 (tool_call 专属)
  output?: string;  // 命令执行结果 (tool_call 专属)
  timestamp: number;
}
```

## 6. 用户体验与容错设计 (UX & Error Handling)

1. **防误触机制**：新建任务派发给 AI 时，强制要求输入“验收测试指令 (CI Command)”，以防止 AI 无限盲目提交错误代码。
2. **视觉层级**：正常业务流保持亮色调 (Light Theme) 以缓解眼部疲劳；将 Agent 日志输出区域设计为暗色调 (Dark Theme) 终端样式，在视觉上建立“代码沙盒执行区”的边界感。
3. **滚动锚定**：面板中的终端日志区必须实现新消息到达时的自动平滑滚动，并在用户手动向上查阅日志时暂停自动滚动。