# tech-news 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 `internal://ai/tech-news` 的内容结构、可配置性和工程健壮性：改为 5 个场景栏目（今日关注/技术前沿/应用落地/行业观察/股票投资）、支持可配置源站域名和股票配置、增加 highlight 头条区、每条资讯带 source 字段。

**Architecture:** 新增 `server/config/tech-news.json` 配置文件；重写 `server/services/ai.js` 中 `generateTechNews` 函数逻辑；重写 `server/templates/tech-news.ejs` 模板渲染。

**Tech Stack:** Node.js (Express + mysql2), EJS, DeepSeek API

## Global Constraints

- Node.js v18+ (existing project)
- 接口路径 `internal://ai/tech-news` 不变
- 配置文件的 sources 列表用于约束 AI 生成 URL 的源站域名
- 所有用户可见文字使用中文
- 不自动重启前后端服务、不自动 git 操作（用户偏好）

---

### Task 1: 创建配置文件 `server/config/tech-news.json`

**Files:**
- Create: `E:/Homebition/server/config/tech-news.json`

- [ ] **Step 1: 创建配置文件**

```json
{
  "sources": [
    "36kr.com",
    "ithome.com",
    "cnbeta.com",
    "jiqizhixin.com",
    "leiphone.com",
    "huxiu.com",
    "thepaper.cn",
    "tech.sina.com.cn",
    "tech.qq.com",
    "mp.weixin.qq.com"
  ],
  "stocks": {
    "markets": ["美股", "港股"],
    "industries": ["半导体", "大模型"],
    "tickers": ["NVDA", "TSLA", "BABA"]
  }
}
```

---

### Task 2: 重写 `generateTechNews` 函数逻辑

**Files:**
- Modify: `E:/Homebition/server/services/ai.js`

**Changes:**
1. 在模块加载时读取 `server/config/tech-news.json`
2. 将 sources 列表注入 prompt，要求 AI **仅从这些域名生成链接**
3. 将 stocks 配置注入 prompt，驱动「股票投资」栏目
4. prompt 要求输出 5 个 sections：今日关注、技术前沿、应用落地、行业观察、股票投资
5. 增加 `highlight` 字段（今日头条 1-2 条）
6. 每条资讯增加 `source` 字段（来源网站名）
7. JSON 解析失败时降级返回基本结构
8. 所有内容要求中文

- [ ] **Step 1: 新增配置读取代码**

```javascript
const path = require('path');
const configPath = path.join(__dirname, '../config/tech-news.json');
let techNewsConfig = { sources: [], stocks: { markets: [], industries: [], tickers: [] } };
try {
  techNewsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  logger.warn('[ai] 未找到 tech-news 配置文件，使用默认空配置');
}
```

- [ ] **Step 2: 重写 `generateTechNews` prompt**

```
你是一个AI技术资讯编辑。请生成今天的AI技术前沿早报，所有内容必须使用中文。

## 可用的来源网站（URL 仅限于以下域名下的链接）

{sourcesList}

## 股票投资关注配置

市场：{markets}
行业：{industries}
个股代码：{tickers}

## 栏目要求

请按以下 5 个栏目组织内容，每个栏目至少 2 条：

1. 今日关注 — 最重要的 AI 头条 + 讨论热点
2. 技术前沿 — 新论文 + GitHub 热门开源项目
3. 应用落地 — AI 产品发布/更新 + 实用 AI 工具推荐
4. 行业观察 — 融资动态 + 行业观点/分析
5. 股票投资 — 基于配置的市场/行业/个股，分析 AI 相关动态

## 严格约束

- 每条资讯必须包含真实可访问的 URL，只能从「可用的来源网站」中选择
- 如果对某个新闻的 URL 不确定，请放弃该条目，不要捏造
- 每条资讯必须包含 source 字段（来源网站中文名，如"36氪""IT之家"）
- 前 1-2 条最重要的新闻放在 highlight 数组
- 所有内容使用中文
```

- [ ] **Step 3: JSON 返回格式定义（在 prompt 中附上）**

```json
{
  "date": "{dateStr}",
  "subject": "AI技术前沿早报 - {dateStr}",
  "highlight": [
    {
      "title": "重点标题",
      "summary": "摘要",
      "url": "https://...",
      "source": "来源名"
    }
  ],
  "sections": [
    {
      "name": "今日关注",
      "icon": "🔥",
      "items": [
        { "title": "标题", "summary": "摘要", "url": "https://...", "source": "来源名" }
      ]
    },
    { "name": "技术前沿", "icon": "⚡", "items": [] },
    { "name": "应用落地", "icon": "🚀", "items": [] },
    { "name": "行业观察", "icon": "💡", "items": [] },
    { "name": "股票投资", "icon": "📈", "items": [] }
  ]
}
```

- [ ] **Step 4: JSON 解析 + fallback**

```javascript
if (jsonMatch) {
  const result = JSON.parse(jsonMatch[0]);
  // 确保必要字段存在
  if (!result.sections) result.sections = [];
  if (!result.highlight) result.highlight = [];
  logger.info('[ai] tech-news 生成成功');
  return result;
}
// fallback
return {
  date: dateStr,
  subject: `AI技术前沿早报 - ${dateStr}`,
  highlight: [],
  sections: []
};
```

- [ ] **Step 5: 改 module.exports 也要加 fs require**

---

### Task 3: 重构 `server/templates/tech-news.ejs`

**Files:**
- Modify: `E:/Homebition/server/templates/tech-news.ejs`

**Changes:**
- 顶部展示 highlight 头条区（大卡片式）
- 按 5 个 sections 分组渲染
- 股票投资模块用特殊背景色/边框
- 每条显示 source 标签

- [ ] **Step 1: 模板结构示意**

```
┌─ Header ──────────────────────────┐
│  AI技术前沿早报                    │
│  <date>                           │
├─ 🔥 今日头条 ────────────────────┤
│  [大卡片] 标题 + 摘要 + 来源      │
│  [大卡片] 标题 + 摘要 + 来源      │
├─ 🔥 今日关注 ────────────────────┤
│  标题 [来源]  摘要               │
│  标题 [来源]  摘要               │
├─ ⚡ 技术前沿 ─────────────────────┤
│  ...                              │
├─ 🚀 应用落地 ─────────────────────┤
│  ...                              │
├─ 💡 行业观察 ─────────────────────┤
│  ...                              │
├─ 📈 股票投资 ────────────────────┤
│  [特殊背景] 标题 + 分析           │
└────────────────────────────────────┘
```

---

### 完整变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/config/tech-news.json` | 新建 | 可配置源站域名和股票关注 |
| `server/services/ai.js` | 修改 | 重写 generateTechNews |
| `server/templates/tech-news.ejs` | 修改 | 适配新返回结构渲染 |
