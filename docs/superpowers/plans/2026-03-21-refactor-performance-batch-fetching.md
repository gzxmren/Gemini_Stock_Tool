# 重构任务 3: 侧边栏性能优化 (Batch Quotes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解决侧边栏 N+1 查询问题。通过实现后端批量行情接口，将 20+ 个网络请求缩减为 1 个，极大提升自选列表的刷新性能。

**Architecture:** 
1. **后端接口**: `GET /api/quotes` - 接收一个逗号分隔的代码列表（如 `AAPL,TSLA,MSFT`），返回一个包含所有这些股票最新行情的字典。
2. **前端逻辑**: `Sidebar.tsx` - 将循环请求改为一次性请求，并批量更新列表状态。

**Tech Stack:** FastAPI, yfinance, React

---

### Task 1: 实现后端批量查询接口

**Files:**
- Modify: `backend/api/market.py`

- [ ] **Step 1: 增加 `/quotes` 路由**
解析 `symbols` 参数。使用 `yf.download(symbols_list, period='1d')` 或并发处理来获取数据。
返回结构化 JSON：`{"AAPL": {...}, "TSLA": {...}}`。

- [ ] **Step 2: Commit**
```bash
git add backend/api/market.py
git commit -m "feat(backend): implement batch quotes endpoint"
```

---

### Task 2: 优化侧边栏请求逻辑

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: 移除循环 Fetch**
删除 `for (const item of data)` 循环请求单个价格的代码。

- [ ] **Step 2: 实现批量同步**
调用 `/api/quotes?symbols=...`。
一次性更新 `watchlist` 状态。

- [ ] **Step 3: 验证刷新效果**
确保刷新时依然平滑，且网络面板（Network Tab）请求数量显著减少。

- [ ] **Step 4: Commit**
```bash
git add src/components/Sidebar.tsx
git commit -m "perf(frontend): optimize sidebar to use batch quotes"
```
