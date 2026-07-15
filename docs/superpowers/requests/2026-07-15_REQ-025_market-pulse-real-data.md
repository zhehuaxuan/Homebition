# [REQ-025] 市场脉动模块改为实时行情数据源

**提出日期**: 2026-07-15
**状态**: 设计稿
**关联需求**: REQ-024（tech-news 重构）

## 1. 原始需求

市场脉动模块由 AI 生成的内容（涨跌幅、价格）经常不准确。需要改为**后端代码从腾讯免费行情 API 拉取实时数据**，大盘指数和个股行情由真实数据驱动，行业板块保持 AI 资讯摘要形式。

## 2. 验收标准

- [ ] 大盘指数（上证、深证、创业板）显示真实涨跌幅、成交额
- [ ] 个股（盐津铺子、五洲新春等）显示真实现价、涨跌幅
- [ ] 行业板块仍由 AI 从配置源站摘录新闻（定性描述，无数字）
- [ ] 腾讯行情 API 不可用时降级显示"数据暂不可用"
- [ ] 配置文件 stocks 结构调整为带 code 字段

## 3. 设计方案

### 3.1 数据源

腾讯免费行情 API：`http://qt.gtimg.cn/q={codes}`

返回格式为 `v_code="market~name~code~price~prev_close~open~volume~...~change~change_pct~high~low~~timestamp"`，按 `~` 分割。

### 3.2 配置调整

`tech-news.json` 中 stocks 结构调整：

```json
{
  "stocks": {
    "markets": [
      { "name": "上证指数", "code": "sh000001" },
      { "name": "深证成指", "code": "sz399001" },
      { "name": "创业板指", "code": "sz399006" }
    ],
    "industries": ["半导体", "创新药", "AI算力"],
    "tickers": [
      { "name": "盐津铺子", "code": "sz002847" },
      { "name": "五洲新春", "code": "sh603667" }
    ]
  }
}
```

### 3.3 新增文件

`server/services/market-data.js`：
- `fetchMarketQuotes(markets)` — 拉取大盘指数行情
- `fetchStockQuotes(tickers)` — 拉取个股行情
- 腾讯 API 返回的 `~` 分隔字符串解析
- 数据格式化（万、亿单位转换）
- 超时/异常降级

### 3.4 后端改动

**`server/services/ai.js`**：
- `generateTechNews` 中，AI 返回后，市场脉动的 `subsections[0]`（市场）和 `subsections[2]`（个股）的数据用 `market-data.js` 的真实数据覆盖

**`server/templates/tech-news.ejs`**：
- 市场脉动渲染新增行情卡片样式（涨显示红色、跌显示绿色）

## 4. 实现计划

### Task 1: 调整配置文件
- stocks.markets 和 stocks.tickers 改为带 code 的对象数组

### Task 2: 新建 market-data.js
- 腾讯行情 API 调用 + 解析
- 降级逻辑

### Task 3: 修改 ai.js
- 引入 market-data.js
- 生成 realtime market/stock data
- AI 返回后替换 subsections[0] 和 subsections[2]

### Task 4: 调整 EJS 模板
- 市场脉动子版块增加涨跌颜色样式

## 5. 变更清单

（实现后自动填充）
