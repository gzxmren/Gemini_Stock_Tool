# 重构任务 1: 后端核心逻辑解耦 (AI Analysis)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `backend/api/ai_analysis.py` 中的庞大函数拆分为 Controller, Service 和 Repository 三层架构，提高代码的可维护性和可测试性。

**Architecture:** 
1. **Repository 层**: `backend/repositories/analysis_repo.py` - 负责所有与 `AIAnalysisCache` 表相关的数据库增删改查。
2. **Service 层**: `backend/services/ai_service.py` - 负责数据采集 (yfinance)、切片逻辑、Prompt 构建以及调用大模型。
3. **Controller 层**: `backend/api/ai_analysis.py` - 仅作为 FastAPI 路由，负责解析请求参数并协调 Service 和 Repository。

**Tech Stack:** FastAPI, SQLAlchemy, DeepSeek (OpenAI SDK)

---

### Task 1: 建立 Repository 层

**Files:**
- Create: `backend/repositories/analysis_repo.py`

- [ ] **Step 1: 实现 Repository 逻辑**
包含 `get_cache`, `save_cache`, `clear_expired_cache` 等方法。

- [ ] **Step 2: Commit**
```bash
git add backend/repositories/analysis_repo.py
git commit -m "refactor(backend): create analysis repository for db operations"
```

---

### Task 2: 建立 Service 层

**Files:**
- Create: `backend/services/ai_service.py`

- [ ] **Step 1: 移动业务逻辑**
将 yfinance 数据抓取、Pandas 数据处理、Prompt 模板和 LLM 调用逻辑移至此处。
封装为 `AIService` 类。

- [ ] **Step 2: Commit**
```bash
git add backend/services/ai_service.py
git commit -m "refactor(backend): create ai service for business logic and llm integration"
```

---

### Task 3: 重构路由层 (Controller)

**Files:**
- Modify: `backend/api/ai_analysis.py`

- [ ] **Step 1: 简化路由代码**
注入 `AIService` 和 `AnalysisRepository`。
将原有的 200 行代码缩减为约 30 行的协调逻辑。

- [ ] **Step 2: 验证与测试**
确保原有的单期查询、对比查询、缓存机制功能完全正常。

- [ ] **Step 3: Commit**
```bash
git add backend/api/ai_analysis.py
git commit -m "refactor(backend): streamline ai_analysis router to controller-only"
```
