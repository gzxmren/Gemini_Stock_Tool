# Phase 5: AI 财报透视实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 集成 Google Gemini 实现深度财报 AI 总结。支持 Google Account 登录认证，自动抓取财务指标并生成结构化的基本面透视分析。

**Architecture:** 
1. **认证层**：Electron 处理 OAuth2 回调，后端存储 Access Token。
2. **数据层**：抓取 TTM 利润表、资产负债表及最新新闻。
3. **AI 层**：使用 Gemini Pro 模型处理结构化 Prompt。
4. **展示层**：React 新增 “财报透视” Tab。

**Tech Stack:** FastAPI, Google OAuth2, Vertex AI / Google Generative AI SDK, React.

---

### Task 1: Google OAuth2 认证集成

**Files:**
- Create: `backend/api/auth.py`
- Modify: `backend/main.py`
- Modify: `electron/main.ts`

- [ ] **Step 1: 创建认证后端**
实现 `/api/auth/login` (重定向到 Google) 和 `/api/auth/callback` (接收 code 并交换 token)。

- [ ] **Step 2: Electron 窗口处理**
配置 Electron 拦截授权回调，确保授权后的 Token 安全传递给后端或存储在本地。

### Task 2: 后端 AI 财报分析接口

**Files:**
- Create: `backend/api/ai_analysis.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 实现数据预处理**
编写逻辑：将 `yfinance` 抓取的最近 4 个季度的营收、净利润、毛利率等数据转换为 LLM 易读的 Markdown 格式。

- [ ] **Step 2: Gemini Prompt 工程**
设计专业投资研究员风格的 Prompt，要求 AI 输出：
1. 业绩红绿灯（亮点/痛点）。
2. 核心指标趋势解读。
3. 财务健康度（负债与现金流）。
4. 风险预警。

- [ ] **Step 3: 调用 Gemini 接口**
使用 `google-generativeai` SDK，通过 Access Token 初始化客户端并生成内容。

### Task 3: 前端 “财报透视” 界面实现

**Files:**
- Create: `src/components/AIFundamentals.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 编写 AIFundamentals 组件**
设计具有“研报感”的 UI：
- 使用 `lucide-react` 的 `ShieldCheck`, `AlertTriangle`, `TrendingUp` 图标。
- 采用骨架屏 (Skeleton) 处理 AI 生成时的等待状态。
- 实现“登录 Google 开启分析”的引导逻辑。

- [ ] **Step 2: App.tsx 集成**
新增 `activeTab === 'fundamentals'` 逻辑，将新组件放入主视图。
