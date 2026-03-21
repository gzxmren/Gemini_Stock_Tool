# AI 业绩情报站 (Preliminary Insights) Implementation Plan

## Background & Motivation
传统的正式财报发布存在严重的时间滞后。A 股市场中，业绩快报和业绩预告往往能提前 1-2 个月释放核心基本面信号；美股市场中，分析师评级调整和盈利预期同样是影响短期股价的强催化剂。
为了填补正式财报发布前的“信息真空期”，我们需要在系统中增加一个独立的“AI 业绩情报站”功能面板，专门分析这些高时效性、非正式的“超前/替代数据”。

## Scope & Impact
- **后端**: 新增针对 A 股快报/预告及美股机构评级的抓取与 AI 缝合逻辑，提供全新的 `/api/insights` 接口。
- **前端**: 在主导航/侧边栏新增“情报站”入口；新增高科技感（高对比度）的独立情报站页面。
- **影响**: 代码与现有的 `AIFundamentals` 完全解耦，不影响正式报表逻辑；大幅提升用户在财报季的信息获取优势。

## Proposed Solution
### 1. 数据架构
- **A 股 (CN)**: 使用 `ak.stock_yg_tj_sina` 获取业绩预告，或 `ak.stock_performance_report_sina` 获取业绩快报。
- **美股 (US)**: 使用 `yfinance` 提取 `upgrades_downgrades` (评级调整) 和 `earnings_estimate` (盈利预期)。
- **AI 模型**: 使用 DeepSeek 进行“催化剂冲击力”分析，输出预期差、短期风险及情绪面评估。
- **缓存**: 由于时效性强，该模块接口的数据缓存时间设置为 12 小时。

### 2. UI/UX 设计
- **导航 (Navigation)**: 在 `App.tsx` 的顶部控制栏增加一个带有雷电图标 (Zap) 的 `AI 业绩情报` Tab。
- **面板视觉 (InsightsStation)**: 采用暗色系或科技感设计（例如沉浸式黑色背景）。左侧展示近期情报快照卡片（预增 50% / 高盛买入），右侧展示 AI 的深度解读报告。

## Implementation Steps

- [ ] **Phase 1: 数据库与缓存扩展**
  - 更新 `backend/models.py`，新增用于存储短效情报分析的表 `AIInsightsCache`，并更新数据库初始化逻辑。

- [ ] **Phase 2: 后端数据与 AI 服务**
  - 新增 `backend/services/insights_service.py`。
  - 实现 A 股情报获取逻辑（带有严谨的异常捕获与短超时）。
  - 实现美股情报获取逻辑。
  - 实现专门针对“催化剂影响”的 Prompt 生成逻辑，调用 AI 大模型。

- [ ] **Phase 3: 后端 API 路由**
  - 在 `backend/api/` 新增 `insights.py` 路由文件。
  - 提供 `GET /api/insights/latest` 接口。
  - 在 `backend/main.py` 中挂载该路由。

- [ ] **Phase 4: 前端 UI 组件开发**
  - 修改 `src/App.tsx`，在 Header 中增加 `insights` 的 activeTab 选项。
  - 新建 `src/components/InsightsStation.tsx` 及其子组件，实现酷炫的情报站视觉布局。

- [ ] **Phase 5: 联调与测试**
  - 针对 A 股（如 600519）测试快报/预告抓取与解析。
  - 针对美股（如 AAPL）测试机构评级变动提取。
  - 确保极端情况下（无网络、无最新情报）UI 的优雅降级与兜底提示。

## Verification & Testing
- 运行应用，点击顶部 `AI 业绩情报` 按钮，切换中美股，确保页面不崩溃且 AI 分析能够针对“非正式数据”进行合理输出。