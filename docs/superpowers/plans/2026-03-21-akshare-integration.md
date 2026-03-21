# A股数据源切换 (AkShare 集成) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 彻底解决 A 股财报数据严重滞后的问题。在后端 `AIService` 中引入双轨制数据抓取：美股继续使用 `yfinance`，A股则切换到国内专业的 `akshare` 库获取最新财报。

**Architecture:** 
1. **数据分发中心**: 在 `backend/services/ai_service.py` 中，重构 `get_available_dates` 和 `fetch_financial_data` 方法。根据传入的 `market` 参数（US/CN）走不同的数据抓取分支。
2. **AkShare 适配层**: 
    - 使用 `ak.stock_financial_report_sina(symbol)` 或类似接口获取 A 股最新的资产负债表、利润表和现金流量表。
    - 将 AkShare 返回的中文 Pandas DataFrame 列名和结构，统一清洗（Clean & Map）为我们现有的英文标准化结构（`revenue`, `net_income`, `gross_profit`, `total_debt`, `fcf`）。
3. **平滑降级**: 如果 `akshare` 接口因网络波动失败，要有完善的 `try-except` 捕获，并返回清晰的报错信息，而不是让后端崩溃。

**Tech Stack:** Python, Pandas, AkShare, FastAPI

---

### File Structure

**Files:**
- Modify: `backend/services/ai_service.py` - Implement dual-track data fetching and normalization logic.
- Modify: `backend/api/market.py` - Also update the `get_quote` anchor date logic to use the new `AIService` methods so that N+1 N-1 N-2 logic is consistent.

---

### Task 1: 编写 AkShare 数据抓取与归一化逻辑

**Files:**
- Modify: `backend/services/ai_service.py`

- [ ] **Step 1: 导入 AkShare**
确保在文件顶部导入 `import akshare as ak`，如果引发导入错误，说明需要在虚拟环境中安装。

- [ ] **Step 2: 实现 `_fetch_cn_financials` 辅助方法**
在 `AIService` 类中新增一个专门处理 A 股数据的方法。
逻辑要点：
1. 传入纯数字 `symbol` (如 "600519")。
2. 由于 akshare 的财务接口通常返回非常庞大的历史数据，我们需要提取最近几期的日期作为 `available_dates`。
3. **映射指标**:
   - 营业总收入 -> `revenue`
   - 净利润 -> `net_income`
   - 营业利润 / 毛利 -> `gross_profit`
   - 负债合计 -> `total_debt`
   - 经营活动产生的现金流量净额 + 投资活动产生的现金流量净额 -> `fcf` (自由现金流的粗略近似)
4. 将提取的数据构造为与原有 `yfinance` 逻辑相同的 `(dates, data_dict)` 元组返回。

- [ ] **Step 3: 重构入口方法 `fetch_financial_data` 和 `get_available_dates`**
增加判断：
```python
if market.upper() == 'CN':
    return self._fetch_cn_financials(symbol, target_date, compare_date)
else:
    # 原有的 yfinance 逻辑
```

- [ ] **Step 4: 编写代码测试**
编写一个简单的本地测试块或依赖 `pytest` 运行，确保传入 "600519" 能够成功拿到包含 2024 年甚至 2025 年数据的结构化字典。

- [ ] **Step 5: Commit**
```bash
git add backend/services/ai_service.py
git commit -m "feat(backend): implement akshare dual-track logic for CN market financials"
```

---

### Task 2: 统一锚点逻辑 (Market API)

**Files:**
- Modify: `backend/api/market.py`

- [ ] **Step 1: 替换获取 `latest_report_date` 的逻辑**
在 `get_quote` 函数中，我们之前使用 `yfinance` 来确定 A 股和美股的 `latest_report_date`。现在 A 股走 yfinance 肯定拿不到最新的锚点。
修改逻辑，引入 `AIService().get_available_dates(symbol, market)` 来获取真实的最新日期。

- [ ] **Step 2: Commit**
```bash
git add backend/api/market.py
git commit -m "fix(backend): align market quote anchor dates using the new dual-track data service"
```
