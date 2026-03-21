# 重构任务 2: 前端组件原子化 (AI Fundamentals)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 拆分 `src/components/AIFundamentals.tsx` 这个“巨石组件”，将其渲染逻辑划分为多个功能单一的小组件，提升代码可读性。

**Architecture:** 
1. **容器组件**: `AIFundamentals.tsx` - 负责状态管理、数据拉取和逻辑协调。
2. **视图组件**: 
    * `ControlBar.tsx`: 负责时间粒度切换、日期选择和对比模式控制。
    * `AnalysisReport.tsx`: 负责展示生成的 AI 研报内容（标题、卡片、结论）。
    * `TimeMachineLanding.tsx`: 负责展示未分析时的引导页面。

**Tech Stack:** React, TailwindCSS, Lucide Icons

---

### Task 1: 创建子组件文件夹与视图组件

**Files:**
- Create: `src/components/AIFundamentals/ControlBar.tsx`
- Create: `src/components/AIFundamentals/AnalysisReport.tsx`
- Create: `src/components/AIFundamentals/LandingPage.tsx`

- [ ] **Step 1: 提取 ControlBar**
将顶部日期选择、对比开关等 UI 逻辑移至 `ControlBar.tsx`。

- [ ] **Step 2: 提取 AnalysisReport**
将 Header（带分值）、业绩红绿灯、趋势解读等展示逻辑移至 `AnalysisReport.tsx`。

- [ ] **Step 3: 提取 LandingPage**
将引导页逻辑移至 `LandingPage.tsx`。

- [ ] **Step 4: Commit**
```bash
git add src/components/AIFundamentals/
git commit -m "feat(frontend): extract sub-components for ai fundamentals"
```

---

### Task 2: 整合主容器组件

**Files:**
- Modify: `src/components/AIFundamentals.tsx`

- [ ] **Step 1: 简化主组件**
移除所有复杂的 JSX 渲染代码，改为调用上述子组件。
通过 Props 传递状态和回调函数。

- [ ] **Step 2: 验证 UI 与交互**
确保重构后样式无损，且所有交互（切换日期、开启对比、导出）功能如初。

- [ ] **Step 3: Commit**
```bash
git add src/components/AIFundamentals.tsx
git commit -m "refactor(frontend): simplify main fundamentals component using atomized parts"
```
