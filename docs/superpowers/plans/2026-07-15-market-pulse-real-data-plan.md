# 市场脉动实时行情 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `internal://ai/tech-news` 中的市场脉动模块从 AI 生成改为腾讯免费行情 API 实时数据拉取，大盘指数和个股行情报价 100% 真实准确。

**Architecture:** 新增 `server/services/market-data.js` 数据服务层，负责调用腾讯行情 API 并解析数据；`server/services/ai.js` 中 AI 返回结果后，市场脉动子版块用实时数据替换 AI 生成内容。

**Tech Stack:** Node.js (axios), 腾讯免费行情 API (`qt.gtimg.cn`)

## Global Constraints

- 腾讯行情 API 返回 GBK 编码，需要转码处理
- 接口路径 `internal://ai/tech-news` 不变
- 不自动重启前后端服务、不自动 git 操作

---

### Task 1: 调整 tech-news 配置文件

**Files:**
- Modify: `E:/Homebition/server/config/tech-news.json`

- [ ] **Step 1: 修改 stocks 结构**

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

---

### Task 2: 新建 `server/services/market-data.js`

**Files:**
- Create: `E:/Homebition/server/services/market-data.js`

**腾讯 API 返回格式说明**

```
v_code="market~name~code~price~prev_close~open~volume~...~change~change_pct~high~low~~timestamp"
```

以 `~` 分割，关键字段索引：
- 1=name, 3=current_price, 4=prev_close, 5=open
- 6=volume(手), 7=amount(元)
- 32=timestamp, 33=change, 34=change_pct

个股的涨跌幅在字段 32~33 之间，指数在字段 33~34 之间。

- [ ] **Step 1: 实现 `fetchQuotes` 函数**

```javascript
const axios = require('axios');
const iconv = require('iconv-lite');

const GT_URL = 'http://qt.gtimg.cn/q=';

async function fetchQuotes(codes) {
  if (!codes || codes.length === 0) return [];
  try {
    const resp = await axios.get(GT_URL + codes.join(','), {
      responseType: 'arraybuffer',
      timeout: 8000,
      transformResponse: []
    });
    // GBK to UTF-8
    const text = iconv.decode(Buffer.from(resp.data), 'gbk');
    return text.split(';').filter(Boolean).map(parseLine);
  } catch (err) {
    return [];
  }
}
```

- [ ] **Step 2: 解析单行数据**

```javascript
function parseLine(line) {
  const m = line.match(/"(.+)"/);
  if (!m) return null;
  const parts = m[1].split('~');
  return {
    code: parts[2],
    name: parts[1],
    price: parseFloat(parts[3]) || 0,
    prevClose: parseFloat(parts[4]) || 0,
    open: parseFloat(parts[5]) || 0,
    volume: parseInt(parts[6]) || 0,       // 手
    amount: parseFloat(parts[7]) || 0,      // 元
    high: parseFloat(parts[33]) || 0,
    low: parseFloat(parts[34]) || 0,
    change: parseFloat(parts[31]) || 0,
    changePct: parseFloat(parts[32]) || 0,
    timestamp: parts[30] || ''
  };
}
```

- [ ] **Step 3: 格式化辅助函数**

```javascript
function formatAmount(amount) {
  if (amount >= 1e8) return (amount / 1e8).toFixed(1) + '亿';
  if (amount >= 1e4) return (amount / 1e4).toFixed(1) + '万';
  return amount.toString();
}

function formatChange(change, pct) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}（${sign}${pct.toFixed(2)}%）`;
}
```

- [ ] **Step 4: 导出整合接口**

```javascript
async function getMarketData(markets, tickers) {
  const marketCodes = markets.map(m => m.code);
  const tickerCodes = tickers.map(t => t.code);
  const allCodes = [...marketCodes, ...tickerCodes];
  const quotes = await fetchQuotes(allCodes);
  // 按 code 建立 map
  const map = {};
  quotes.forEach(q => { if (q) map[q.code] = q; });
  // 组装市场结果
  const marketItems = markets.map(m => {
    const q = map[m.code];
    return q ? {
      title: m.name,
      summary: `现价 ${q.price} · ${formatChange(q.change, q.changePct)} · 成交 ${formatAmount(q.amount)}`,
      date: q.timestamp.slice(0, 8),
      source: '腾讯行情'
    } : { title: m.name, summary: '数据暂不可用', source: '' };
  });
  // 组装个股结果
  const tickerItems = tickers.map(t => {
    const q = map[t.code];
    return q ? {
      title: t.name,
      summary: `现价 ${q.price} · ${formatChange(q.change, q.changePct)} · 成交 ${formatAmount(q.amount)}`,
      date: q.timestamp.slice(0, 8),
      source: '腾讯行情'
    } : { title: t.name, summary: '数据暂不可用', source: '' };
  });
  return { marketItems, tickerItems };
}

module.exports = { getMarketData };
```

---

### Task 3: 修改 `server/services/ai.js` — 市场脉动用实时数据替换

**Files:**
- Modify: `E:/Homebition/server/services/ai.js`

- [ ] **Step 1: 引入 market-data.js**

```javascript
const { getMarketData } = require('./market-data');
```

- [ ] **Step 2: AI 返回后，获取实时数据并替换市场脉动子版块**

在 `resolveSourceUrls(result)` 之后，加入实时数据覆盖逻辑：

```javascript
// 市场脉动子版块替换为实时数据
const pulseSection = result.sections?.find(s => s.name === '市场脉动');
if (pulseSection && pulseSection.subsections) {
  const { getMarketData } = require('./market-data');
  const { stocks } = techNewsConfig;
  if (stocks.markets && stocks.markets.length > 0) {
    try {
      const { marketItems, tickerItems } = await getMarketData(stocks.markets, stocks.tickers);
      // 替换「市场」子版块
      const marketSub = pulseSection.subsections.find(s => s.name === '市场');
      if (marketSub && marketItems.length > 0) marketSub.items = marketItems;
      // 替换「个股」子版块
      const tickerSub = pulseSection.subsections.find(s => s.name === '个股');
      if (tickerSub && tickerItems.length > 0) tickerSub.items = tickerItems;
    } catch (e) {
      logger.warn('[ai] 获取实时行情失败，保留 AI 生成内容: ' + e.message);
    }
  }
}
```

- [ ] **Step 3: 调整 prompt 中市场脉动的描述**

改为只保留「行业」子版块让 AI 生成，市场和个股由代码填充：

```
5. 市场脉动 — 包含三个子版块：
   - 市场：由实时行情数据填充（代码生成）
   - 行业：摘录配置行业的动态新闻和机构观点（AI 生成）
   - 个股：由实时行情数据填充（代码生成）
```

---

### Task 4: EJS 模板调整 — 涨跌颜色

**Files:**
- Modify: `E:/Homebition/server/templates/tech-news.ejs`

- [ ] **Step 1: 增加涨跌样式**

```css
.change-up { color: #c62828; font-weight: 600; }
.change-down { color: #2e7d32; font-weight: 600; }
```

- [ ] **Step 2: 市场脉动子版块增加涨跌高亮**

对包含 `+` 或 `-` 的 summary 做颜色标记（模板层判断）。

---

### 完整变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/config/tech-news.json` | 修改 | stocks 结构调整为带 code 的对象数组 |
| `server/services/market-data.js` | 新建 | 腾讯行情 API 调用 + 解析 + 格式化 |
| `server/services/ai.js` | 修改 | 引入 market-data，替换市场脉动子版块 |
| `server/templates/tech-news.ejs` | 修改 | 涨跌颜色样式 |
