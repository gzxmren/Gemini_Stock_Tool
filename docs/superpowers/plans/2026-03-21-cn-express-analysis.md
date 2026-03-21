# A股“业绩快报”集成与 UI 历史记录增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 A 股业绩快报数据的自动“缝合”分析，让用户在年报正式发布前就能看到基于最新营收/利润的 AI 报告。同时在 UI 中增加“分析记录”快捷导航栏，消除用户对缓存状态的困惑。

**Architecture:** 
1. **数据维度扩展**: 后端 `AIService` 新增 `fetch_cn_express_data`，抓取未审计的业绩快报数字。
2. **逻辑“缝合”层**: 实现数据对齐算法。如果请求日期对应的是快报，自动提取最新的一份正式财报作为“底图”，并将营收、净利等关键指标覆盖为快报值。
3. **元数据增强**: 升级 `/api/analysis/dates` 接口，返回该股票在数据库中已有的所有缓存日期。
4. **前端视觉升级**:
    *   `ControlBar`: 新增 `AnalysisHistory` 药丸标签组。
    *   `AnalysisReport`: 新增橙色“业绩快报”警告条和置信度勋章。

**Tech Stack:** Python (AkShare), React (Tailwind), Lucide Icons

---

### Task 1: 后端实现业绩快报“缝合”逻辑

**Files:**
- Modify: `backend/services/ai_service.py`

- [ ] **Step 1: 实现 `_fetch_cn_express_data` 助手方法**
调用 `ak.stock_zh_a_gd_exp(symbol)` 获取最新快报。
提取 `营业收入` 和 `净利润` 及其对应的 `公告日期`。

- [ ] **Step 2: 升级 `fetch_financial_data` 逻辑**
实现“缝合”算法：
1. 检查请求日期是否属于快报日期。
2. 如果是，获取最近的一期正式三表数据。
3. 使用快报值覆盖营收和利润。
4. 返回元组增加 `is_preliminary: bool` 标记。

- [ ] **Step 3: 升级 `generate_analysis` 方法**
根据 `is_preliminary` 标记，在 Prompt 中注入强制性指令，要求 AI 关注快报性质，并在返回的 JSON 中保留此状态。

- [ ] **Step 4: Commit**
```bash
git add backend/services/ai_service.py
git commit -m "feat(backend): implement financial data stitching for CN performance express"
```

---

### Task 2: 升级日期查询接口 (支持缓存预览)

**Files:**
- Modify: `backend/api/ai_analysis.py`
- Modify: `backend/repositories/analysis_repo.py`

- [ ] **Step 1: Repository 增加查询所有日期方法**
在 `AnalysisRepository` 中新增 `get_all_cached_dates(symbol, market)`。

- [ ] **Step 2: 升级 `/analysis/dates` 路由**
返回结果中新增 `cached_dates` 数组。

- [ ] **Step 3: Commit**
```bash
git add backend/api/ai_analysis.py backend/repositories/analysis_repo.py
git commit -m "feat(backend): return list of already analyzed dates in dates endpoint"
```

---

### Task 3: 前端 UI 重构 (控制栏与历史记录)

**Files:**
- Modify: `src/components/AIFundamentals/ControlBar.tsx`
- Modify: `src/components/AIFundamentals.tsx`

- [ ] **Step 1: 实现“分析记录”标签组**
在日期选择器下方渲染 `cached_dates`。
支持点击标签快速切换 `selectedDate`。

- [ ] **Step 2: 强化下拉列表标注**
在 Select 框中，对快报日期进行文字标注。

- [ ] **Step 3: Commit**
```bash
git add src/components/AIFundamentals/ControlBar.tsx
git commit -m "feat(frontend): add analysis history pills and express data labeling"
```

---

### Task 4: 前端 UI 重构 (报告头部与警告条)

**Files:**
- Modify: `src/components/AIFundamentals/AnalysisReport.tsx`

- [ ] **Step 1: 实现双态 Header**
根据 `is_preliminary` 状态显示橙色警告条。
显示“业绩快报预披露”勋章。

- [ ] **Step 2: 置信度勋章**
在结论区域下方渲染置信度标识。

- [ ] **Step 3: Commit**
```bash
git add src/components/AIFundamentals/AnalysisReport.tsx
git commit -m "feat(frontend): add preliminary data warning visual elements"
```
