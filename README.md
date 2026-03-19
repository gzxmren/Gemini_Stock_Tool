# 📈 股票助手 PRO (Stock Analyzer & Screener PRO)

一款专为个人投资者打造的跨平台桌面端股票分析与筛选工具。它通过极简的交互界面，将复杂的金融数据转化为直观的投资洞察。

## ✨ 核心特色

### 1. 深度估值系统 (Advanced Valuation)
*   **纵向估值水位计**：实时计算当前 PE/PB 在过去 3-5 年历史区间的位置（分位点），一眼看清估值贵贱。
*   **分析师一致预期**：汇总顶级金融机构对目标价的预测（最高、最低、均值），直观展示上涨空间。
*   **交互式 DCF 模拟器**：内置动态现金流折现模型，支持实时拖动滑块调整增长率与折现率，瞬间重算内在价值。

### 2. 专业版 DCF 建模 (Professional Modeling)
*   **三大报表自动对齐**：自动从雅虎财经抓取营收、EBIT、D&A、CAPEX 等核心财务数据。
*   **汇率自动折算**：完美支持 ADR（如 BABA, TSM），自动识别并折算报表货币与交易货币。
*   **WACC 智能估算**：基于实时无风险利率 (Rf) 与 $\beta$ 系数自动计算资本成本。
*   **分红回报分析**：深度展示股息率、派息率及近三年派息历史。

### 3. 自选与持久化 (Portfolio)
*   **极简侧边栏**：快速切换关注股票，实时同步最新价格。
*   **本地私密存储**：使用本地 SQLite 数据库存储您的自选列表，无需账号，保护隐私。

## 🛠️ 技术架构

*   **前端 (UI)**: React 18, TypeScript, TailwindCSS, Lucide Icons.
*   **桌面容器**: Electron (提供原生窗口体验).
*   **后端 (Engine)**: FastAPI (Python 3.10+), SQLAlchemy (ORM).
*   **数据源**: 
    *   美股：`yfinance` (Yahoo Finance API)
    *   A股：`httpx` (Tencent Finance API)
*   **本地数据库**: SQLite.

## 🚀 快速启动 (Ubuntu/Linux)

项目内置了一键部署脚本，您可以非常简单地运行它：

1. **克隆项目**
   ```bash
   git clone https://github.com/gzxmren/Gemini_Stock_Tool.git
   cd Gemini_Stock_Tool
   ```

2. **赋予运行权限**
   ```bash
   chmod +x start_ubuntu.sh
   ```

3. **启动应用**
   ```bash
   ./start_ubuntu.sh
   ```
   *脚本会自动创建 Python 虚拟环境、安装所有依赖并同时启动前后端服务。*

## 📅 路线图 (Roadmap)

- [x] Phase 1: 中美股基础行情查询
- [x] Phase 2: DCF 估值引擎与分红分析
- [x] Phase 3: SQLite 自选股持久化
- [ ] Phase 4: 集成 ECharts 实现 K 线图可视化 (即将推出)
- [ ] Phase 5: AI 财报要点自动总结

## ⚖️ 免责声明
本工具仅供学习与辅助分析使用，不构成任何投资建议。股市有风险，入市需谨慎。
