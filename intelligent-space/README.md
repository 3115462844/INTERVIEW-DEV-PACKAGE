# 星汇智慧空间 — 设计说明

## 快速启动

```bash
# 安装依赖（自动安装 mock server 依赖）
npm install

# 启动开发环境（同时启动 mock API + Vite 前端）
npm run dev
```

- Mock API: http://localhost:3001
- 前端页面: http://localhost:5173

## 项目结构与组件划分

项目采用**按功能模块分层**的目录结构：

```
src/
├── api/           # API 请求层（封装 fetch，统一错误处理与超时）
├── components/    # 通用组件（HeaderBar、LeftSidebar、AiPanel 等）
├── pages/         # 页面级组件（Dashboard、WorkOrders）
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数（formatDateTime、formatFloor）
└── test/          # 单元测试
```

组件划分原则：**一个文件只做一件事**。`Dashboard` 负责设备看板的整体布局和数据协调，`DeviceDetailDrawer` 负责设备详情的展示，`LeftSidebar` 只处理楼栋选择和筛选。页面组件通过 props 接收数据，通用组件不直接依赖 API，方便测试和复用。

## 状态管理方案

项目未使用 Redux 或 Zustand 等外部状态库，而是用 **React useState + props 逐层传递**。

理由：项目只有 2 个页面和 1 个侧栏，需要在组件间同步的状态仅有 4 个：`selectedBuilding`（当前楼栋）和 `statusFilter`（状态筛选）在 `LeftSidebar` 和 `Dashboard` 之间同步；`activeTab`（当前页面）在 `HeaderBar` 和内容区之间同步；`aiOpen`（AI 面板开关）控制侧栏显隐。4 个状态用 `useState` + props 逐层传递完全足够。这种规模下引入 Redux 会带来不必要的样板代码。如果后续共享状态增多，会升级为 Zustand——它比 Context 性能更好且迁移成本低。

## AI Tool Calling 流程

AI 助手的聊天循环严格遵循 API Spec 的三步流程：

1. **发送用户消息**：将用户输入作为 `{ role: "user", content }` 发送给 `POST /api/chat`，**不携带历史消息**（每次请求仅发当前输入，减少 token 消耗）
2. **执行工具**：当 LLM 返回 `tool_calls` 时，前端根据 `function.name` 调用对应的 API（`query_devices` → `GET /api/devices`，`query_alerts` → `GET /api/alerts`，`create_work_order` → `POST /api/work-orders`），将 `assistant(tool_calls)` 和 `tool(result)` 两条消息追加到会话数组
3. **获取最终回复**：携带完整的会话数组再次请求 LLM，收到最终文本后展示

工具调用过程在 UI 上通过卡片可视化：运行中显示"正在查询设备..."+ 旋转动画，完成后显示结果概要（如"找到 3 条结果"或"工单 WO-011 已创建"）。

## 主要权衡与取舍

- **React.lazy 代码分割**：将 Dashboard、WorkOrders、AiPanel 拆分为独立 chunk，首屏体积从 1051KB 降至 139KB，切换 Tab 时按需加载。代价是首次切换时有短暂加载延迟（<200ms）。
- **模块级缓存 vs 实时数据**：CreateWorkOrderModal 的设备列表采用模块级缓存，首次打开后不再重复请求。优点是减少冗余网络请求，缺点是如果其他用户新增了设备，下拉列表不会实时更新。对于 mock 场景可接受。
- **Error Boundary + 局部错误状态**：全局用 ErrorBoundary 兜住未预期的渲染崩溃，局部（Dashboard、DeviceDetailDrawer）用独立的 error state 展示失败提示和重试按钮，避免全局的 message.error 一闪而过。


## Mock Server 扩展说明

在 `server.js` 的 `detectIntent` 函数中，为查询告警意图增加了 `未确认` 关键词支持：

```javascript
if (/告警|报警|异常|未确认/.test(text)) {
  ...
  if (/未确认/.test(lower)) args.acknowledged = false;
  ...
}
```

当用户输入包含"未确认"时（如"查看未确认告警"），LLM 会调用 `query_alerts` 工具并传入 `acknowledged: false` 参数，对应 API `GET /api/alerts?acknowledged=false`，仅返回未确认的告警。原始 mock server 只支持按 `buildingId` 和 `level` 筛选告警，无法查询未确认告警，此扩展完善了 AI 助手的查询能力。

## 单元测试说明

项目使用 Vitest + React Testing Library 编写了 4 个测试文件，覆盖 6 个组件/函数，共 18 条测试用例。以下是三个核心测试场景及其意义：


### 场景 1：API 层测试（api.test.ts）

Mock `global.fetch` 验证 `fetchBuildings` 和 `fetchDevices` 的行为，覆盖成功返回、500 错误、404 错误、查询参数拼装等 5 条用例。

**测试意义**：API 层是项目的数据入口，一旦出错会影响所有页面。测试验证了 HTTP 错误被正确转换为异常、查询参数按预期拼装（undefined 参数被省略）。不依赖真实后端，通过 mock 隔离网络，测试稳定可重复。

### 场景 2：LeftSidebar 组件渲染测试（LeftSidebar.test.tsx）

验证楼栋列表渲染、点击楼栋触发 `onBuildingChange` 回调、选择状态筛选触发 `onStatusFilterChange` 回调、loading 态下隐藏列表显示 Spin 组件（4 条用例）。

**测试意义**：LeftSidebar 是一个典型的受控组件——自己不管理数据，全部依赖 props。测试验证了 props 到 UI 的映射正确（楼栋列表渲染）、用户交互到回调的触发正确（点击/筛选）、条件渲染正确（loading 态）。这种组件测试成本低（无 API 依赖），但能有效防止重构时把事件回调绑定错。

### 场景 3：AiPanel 组件交互测试（AiPanel.test.tsx）

Mock API 模块验证 AiPanel 的完整交互流程：挂载时显示加载态然后展示欢迎语、用户发送消息后对话双方都显示在聊天区、API 异常时错误提示出现在界面中（3 条用例）。

**测试意义**：AiPanel 是项目中最复杂的组件，涉及异步 API 调用、状态管理、Tool Calling 循环。测试同时覆盖了正常路径（加载 → 发送 → 回复）、交互路径（输入 → 点击 → 展示）和异常路径（API 挂了 → 错误气泡）。异常路径是最容易被忽略但最重要的测试场景——确保用户不会看到白屏。


## Bug 修复说明

## AI 工具使用记录

本次开发全程使用 Claude Code（VS Code 插件版）作为主要生产力工具。

**使用环节**：
- **组件开发**：AI 生成了三栏布局、设备看板、工单管理、AI 聊天面板等核心组件代码，包括 Ant Design 组件的选型和 props 用法
- **Tool Calling 实现**：AI 设计并实现了完整的 LLM 工具调用循环（发送消息 → 执行工具 → 再次请求），包括中间状态可视化卡片
- **代码优化**：AI 实现了 Error Boundary、代码分割、设备列表缓存、加载失败重试等优化

**效果**：AI 在代码生成、配置搭建、文档撰写方面效率极高，能将开发周期从 2-3 天压缩到约 4 小时（实际对话时间）。在一些组件选型上，AI提供了准确的API参考，减少了查文档的时间。

**AI 帮不上忙的地方**：UI 布局的精细调整（间距、对齐、颜色）需要反复调试，AI 生成的样式代码往往需要人工微调。业务逻辑的决策（比如选择 Drawer 还是 Modal、状态提升到哪个组件）需要结合项目上下文判断，AI 可以提供选项但最终决策仍由人做出。

## Bug 修复说明

### Bug 1：useCallback 闭包过期

- **问题现象**：切换楼栋后，告警列表仍然显示旧楼栋的数据，不会随 `buildingId` 变化而更新。
- **根因分析**：`fetchAlerts` 使用 `useCallback(fn, [])` 创建，依赖数组为空。函数闭包捕获了首次渲染时的 `buildingId`，后续 `buildingId` 变化时，`useCallback` 返回缓存函数，闭包中的 `buildingId` 仍然是旧值。同时 `useEffect` 依赖 `fetchAlerts` 函数引用，函数引用不变就不会重新执行。
- **修复方法**：将 `buildingId` 加入 `useCallback` 的依赖数组 `[buildingId]`。当 `buildingId` 变化时，`useCallback` 创建新函数，`useEffect` 检测到引用变化后重新执行请求。

### Bug 2：setInterval 内存泄漏

- **问题现象**：勾选/取消勾选"自动刷新"多次后，页面请求频率越来越快；切换到其他页面再切回来，旧的请求仍在发送。
- **根因分析**：`useEffect` 创建了 `setInterval` 但没有返回 cleanup 函数。每次 `autoRefresh` 变化时，旧的 interval 不会被清除，新的 interval 又被创建，导致多个 interval 并行运行。
- **修复方法**：在 `useEffect` 中添加 `return () => clearInterval(timer)`。这样当 `autoRefresh` 变化或组件卸载时，旧的 interval 会被正确清除，避免内存泄漏和重复请求。

### Bug 3：直接修改 state 对象

- **问题现象**：点击告警的"确认"按钮后，UI 没有更新，告警仍然显示为未确认状态。刷新页面后确认状态才生效。
- **根因分析**：`handleAcknowledge` 中通过 `alerts.find()` 获取到告警对象后，直接修改了 `alert.acknowledged = true`，然后用 `setAlerts(alerts)` 传入同一个数组引用。React 使用 `Object.is` 比较新旧 state，相同引用跳过重渲染。
- **修复方法**：改为不可变更新 `setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))`。创建新数组和新对象，React 检测到引用变化后触发重渲染。
