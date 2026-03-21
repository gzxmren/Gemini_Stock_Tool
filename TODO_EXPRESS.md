# A股“业绩快报”集成 TODO

- [ ] Task 1: 后端实现业绩快报“缝合”逻辑 @backend/services/ai_service.py
    - [ ] Step 1: 实现 `_fetch_cn_express_data` 助手方法
    - [ ] Step 2: 升级 `fetch_financial_data` 逻辑 (数据缝合)
    - [ ] Step 3: 升级 `generate_analysis` 方法 (Prompt 增强)
    - [ ] Step 4: Commit
- [ ] Task 2: 升级日期查询接口 (支持缓存预览) @backend/repositories/analysis_repo.py, backend/api/ai_analysis.py
    - [ ] Step 1: Repository 增加查询所有日期方法
    - [ ] Step 2: 升级 `/analysis/dates` 路由返回 `cached_dates`
    - [ ] Step 3: Commit
- [ ] Task 3: 前端 UI 重构 (控制栏与历史记录) @src/components/AIFundamentals/ControlBar.tsx
    - [ ] Step 1: 实现“分析记录”标签组
    - [ ] Step 2: 强化下拉列表标注
    - [ ] Step 3: Commit
- [ ] Task 4: 前端 UI 重构 (报告头部与警告条) @src/components/AIFundamentals/AnalysisReport.tsx
    - [ ] Step 1: 实现双态 Header (警告条 & 勋章)
    - [ ] Step 2: 实现置信度勋章
    - [ ] Step 3: Commit
