# 投资复盘模块实现计划

> **Goal:** 实现投资复盘功能，支持自动加载当日行情、结构化记录投资感悟、元数据配置管理、历史复盘回顾。

**Architecture:** 
- 后端新增 `investment_review` 表 + `review_config` 表
- 复用 `services/market-data.js` 的行情能力获取四大指数 + 个股数据
- 新增 `services/investmentReview.js` 服务层
- 新增 `routes/investmentReview.js` 路由
- 前端在「投资管理」分组下新增「每日复盘」功能页，新增「复盘配置」管理页

**Tech Stack:** Express 5 + MySQL 8 + Vue 3 + Element Plus + 腾讯行情 API

## Global Constraints

- 新表名：`investment_review`、`review_config`，使用 InnoDB 引擎、utf8mb4 字符集
- 复盘路由复用 `/api/invest` 前缀，挂载在 `investRouter` 上
- 配置路由独立为 `/api/review-config`
- 前端组件使用 Element Plus 深色主题风格
- 日期格式统一为 `YYYY-MM-DD`

---

### Task 1: 数据库建表

**Files:**
- Modify: `server/routes/investmentReview.js`（包含建表初始化函数）

**Interfaces:**
- Produces: `investment_review` 表、`review_config` 表就绪

- [ ] **Step 1: 在 `server/index.js` 中添加建表初始化**

```js
// 8.6 初始化投资复盘表
const investmentReviewRouter = require('./routes/investmentReview');
investmentReviewRouter.initTables(pool);
```

- [ ] **Step 2: 建表 SQL**

```sql
CREATE TABLE IF NOT EXISTS investment_review (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  review_date     DATE NOT NULL UNIQUE,
  market_snapshot JSON,
  market_sentiment    VARCHAR(50),
  risk_warnings       JSON,
  opportunity_sectors JSON,
  action_plan         VARCHAR(50),
  position_feeling    VARCHAR(50),
  confidence_score    TINYINT,
  free_notes          TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (review_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS review_config (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  group_key   VARCHAR(50) NOT NULL,
  label       VARCHAR(100) NOT NULL,
  value       VARCHAR(50) DEFAULT NULL,
  sort_order  INT DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_label (group_key, label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 3: 插入默认元数据**

```sql
INSERT IGNORE INTO review_config (group_key, label, sort_order) VALUES
('market_sentiment', '乐观', 1),
('market_sentiment', '中性', 2),
('market_sentiment', '偏谨慎', 3),
('market_sentiment', '悲观', 4),
('market_sentiment', '极度风险', 5),
('risk_warning', '大盘风险', 1),
('risk_warning', '科技回调', 2),
('risk_warning', '流动性收紧', 3),
('risk_warning', '政策风险', 4),
('risk_warning', '外部扰动', 5),
('opportunity_sector', '创新药', 1),
('opportunity_sector', '半导体', 2),
('opportunity_sector', 'AI算力', 3),
('opportunity_sector', '消费', 4),
('opportunity_sector', '新能源', 5),
('opportunity_sector', '金融', 6),
('opportunity_sector', '其他', 7),
('action_plan', '加仓', 1),
('action_plan', '减仓', 2),
('action_plan', '调仓', 3),
('action_plan', '观望', 4),
('action_plan', '小幅试探', 5),
('position_feeling', '仓位过重', 1),
('position_feeling', '仓位适中', 2),
('position_feeling', '仓位偏轻', 3);
-- 关注个股示例（含股票代码）
INSERT IGNORE INTO review_config (group_key, label, value, sort_order) VALUES
('watchlist', '盐津铺子', 'sz002847', 1),
('watchlist', '五洲新春', 'sh603667', 2);
```
```

---

### Task 2: 后端服务层 — services/investmentReview.js

**Files:**
- Create: `server/services/investmentReview.js`

**Interfaces:**
- Produces: `getTodayMarket()`, `getByDate()`, `upsert()`, `getList()`, `deleteByDate()`, config CRUD functions

- [ ] **Step 1: 创建服务层**

```js
const logger = require('./logger');
const { getMarketData } = require('./market-data');

// 四大指数代码（固定）
const INDEX_CODES = [
  { name: '上证指数', code: 'sh000001' },
  { name: '深证成指', code: 'sz399001' },
  { name: '创业板指', code: 'sz399006' },
  { name: '科创板指', code: 'sh000688' }
];

/**
 * 从数据库获取关注个股列表
 */
async function getWatchlist(pool) {
  const [rows] = await pool.query(
    "SELECT label, value FROM review_config WHERE group_key = 'watchlist' ORDER BY sort_order"
  );
  return rows.map(r => ({ name: r.label, code: r.value }));
}

/**
 * 获取今日行情数据
 */
async function getTodayMarket(pool) {
  const markets = [...INDEX_CODES];
  // 从配置表读取关注个股
  const tickers = await getWatchlist(pool);
  const markets = [...INDEX_CODES];
  const tickers = stockConfig.stocks?.tickers || [];
  
  const { marketItems, tickerItems } = await getMarketData(markets, tickers);
  
  // 计算A股全市场成交量（上证量 + 深证量）
  const shIndex = marketItems.find(m => m.title === '上证指数');
  const szIndex = marketItems.find(m => m.title === '深证成指');
  const totalVolume = (shIndex?.quote?.amount || 0) + (szIndex?.quote?.amount || 0);
  
  return {
    date: marketItems[0]?.date || new Date().toISOString().slice(0, 10),
    indices: marketItems,
    watchlist: tickerItems,
    totalVolume
  };
}
```

其他 CRUD 方法（getByDate, upsert, getList, deleteByDate）模式与 `dailySummary.js` 一致。

**Config CRUD:**
- `getConfigGroups()` — 获取所有分组及选项
- `getConfigByGroup(groupKey)` — 获取某分组选项
- `updateConfig(groupKey, labels[])` — 替换某分组全部选项

---

### Task 3: 后端路由 — routes/investmentReview.js

**Files:**
- Create: `server/routes/investmentReview.js`
- Modify: `server/index.js`（路由挂载）

- [ ] **Step 1: 复盘相关 API（挂载在 /api/invest 下）**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/invest/review/today` | 获取今日行情 + 今日复盘 |
| PUT | `/api/invest/review/:date` | 新增或更新复盘 |
| GET | `/api/invest/review` | 历史复盘列表 |
| GET | `/api/invest/review/:date` | 指定日期复盘详情 |
| DELETE | `/api/invest/review/:date` | 删除复盘 |

- [ ] **Step 2: 配置管理 API（独立路由 /api/review-config）**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/review-config/groups` | 所有配置分组 |
| GET | `/api/review-config/:groupKey` | 某分组选项列表 |
| PUT | `/api/review-config/:groupKey` | 更新某分组选项（全量替换） |

- [ ] **Step 3: 在 `server/index.js` 挂载**

```js
// 投资复盘路由（挂载在 investRouter 中）
const investmentReviewRouter = require('./routes/investmentReview');
app.use('/api/invest', investmentReviewRouter);
app.use('/api/review-config', investmentReviewRouter);
```

---

### Task 4: 前端复盘页面 — DailyReview.vue

**Files:**
- Rewrite: `client/src/views/about/DailyReview.vue`

- [ ] **Step 1: 页面布局**

```
┌─────────────────────────────────────┐
│ 📈 每日复盘  YYYY-MM-DD              │
│                                     │
│ ┌───── 今日行情 ──────────────────┐ │
│ │ 上证  深证  创业板  科创板        │ │
│ │ 涨跌幅 + 成交额         [刷新]   │ │
│ │ 关注个股: 盐津铺子 +X.XX%       │ │
│ │ A股全市场成交: X.XX万亿          │ │
│ └──────────────────────────────────┘ │
│                                     │
│ ┌───── 复盘记录 ──────────────────┐ │
│ │ 大盘感受: [下拉选择 ▼]          │ │
│ │ 风险预警: [标签1] [标签2] [标签3]│ │
│ │ 机会板块: [标签1] [标签2]       │ │
│ │ 操作计划: [下拉选择 ▼]          │ │
│ │ 仓位感受: [下拉选择 ▼]          │ │
│ │ 信心指数: ★★★★★ (点击评分)   │ │
│ │ 自由感想: [textarea]            │ │
│ │                                 │ │
│ │            [保存复盘]            │ │
│ └──────────────────────────────────┘ │
│                                     │
│ ┌───── 历史复盘 ──────────────────┐ │
│ │ 2026-07-20  大盘偏谨慎 ★★★   〉│ │
│ │ 2026-07-19  大盘乐观 ★★★★   〉│ │
│ │ ...                             │ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- [ ] **Step 2: 核心交互**

| 功能 | 实现方式 |
|------|----------|
| 加载今日行情 | `onMounted` 调 `GET /api/invest/review/today` |
| 加载元数据选项 | 调 `GET /api/review-config/:groupKey` 获取各分组选项 |
| 保存复盘 | `PUT /api/invest/review/:date` 提交完整表单 |
| 查看历史 | 列表右侧显示历史条目，点击进入详情 |
| 非交易日提示 | 行情数据不可用时显示"今日非交易日，无行情数据" |

- [ ] **Step 3: 组件使用 Element Plus**

```vue
<el-select> — 下拉单选
<el-checkbox-group> / <el-tag> — 多选标签
<el-rate> — 评分（5星）
<el-input type="textarea"> — 自由感想
```

---

### Task 5: 元数据配置页面 — ReviewConfig.vue

**Files:**
- Create: `client/src/views/about/ReviewConfig.vue`

- [ ] **Step 1: 页面布局**

```
┌─────────────────────────────────────┐
│ 🛠 复盘配置                          │
│                                     │
│ ┌──────────────────────────────────┐ │
│ │ 大盘感受选项                      │ │
│ │ 乐观 中性 偏谨慎 悲观 极度风险    │ │
│ │ [+添加]                    [保存] │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 风险预警选项                      │ │
│ │ 大盘风险 科技回调 流动性收紧 ...   │ │
│ │ [+添加]                    [保存] │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 关注个股（名称 + 股票代码）       │ │
│ │ 盐津铺子 sz002847  五洲新春 ...  │ │
│ │ 名称[____] 代码[____] [+添加]    │ │
│ │                          [保存]  │ │
│ └──────────────────────────────────┘ │
│ (以此类推其他分组卡片)              │
└─────────────────────────────────────┘
```

- [ ] **Step 2: 交互**

| 功能 | 实现方式 |
|------|----------|
| 展示所有分组 | `GET /api/review-config/groups` |
| 添加选项（普通分组） | 输入框 + 确认按钮 |
| 添加选项（关注个股） | 名称输入框 + 代码输入框 + 确认按钮 |
| 删除选项 | 标签上的关闭按钮 |
| 保存分组 | `PUT /api/review-config/:groupKey` 全量替换 |

- [ ] **Step 3: 路由和导航**

**router/index.js** 添加：
```js
{
  path: 'review-config',
  name: 'ReviewConfig',
  component: () => import('../views/about/ReviewConfig.vue')
}
```

**About.vue sidebar** 在「每日复盘」下方添加：
```js
{ to: '/about/review-config', label: '复盘配置', icon: '⚙️' }
```

移动端 tabLabels 添加：
```js
'/about/review-config': '配置'
```

---

### Task 6: 前端路由与导航集成

**Files:**
- Modify: `client/src/router/index.js`
- Modify: `client/src/views/About.vue`

- [ ] **Step 1: 路由配置**

检查 `/about/daily-review` 和新增 `/about/review-config` 路由。

- [ ] **Step 2: 侧边栏更新**

「投资管理」分组下：
```js
children: [
  { to: '/about/daily-review', label: '每日复盘', icon: '📈' },
  { to: '/about/review-config', label: '复盘配置', icon: '⚙️' },
]
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** 所有 REQ-028 功能点均有对应任务
  - Task 1 → 数据库建表 + 默认元数据插入
  - Task 2 → 行情获取服务 + 复盘 CRUD + 配置 CRUD
  - Task 3 → 复盘 API + 配置管理 API
  - Task 4 → 前端复盘页面（行情展示 + 结构化填写 + 历史查看）
  - Task 5 → 前端配置管理页面
  - Task 6 → 路由与导航集成
- [ ] **File structure:** 所有文件路径精确，职责清晰
- [ ] **Reuse:** 复用 `market-data.js` 的 `getMarketData` 方法获取行情
- [ ] **Dark theme:** 所有前端组件遵循现有深色主题配色
