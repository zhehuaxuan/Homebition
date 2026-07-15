# [REQ-024] tech-news AI 分析重构：场景化栏目 + 可配置源站 + 股票投资模块

**提出日期**: 2026-07-15
**状态**: 设计稿
**关联需求**: REQ-021（订阅任务执行引擎）

## 1. 原始需求

现有 `internal://ai/tech-news` 接口的内容质量、返回结构和可配置性不足，需要从三方面优化：

1. **内容重构为 5 个场景化栏目**：今日关注、技术前沿、应用落地、行业观察、股票投资
2. **支持可配置**：源站域名列表（保证链接可访问）+ 股票投资配置（行业/个股/市场）
3. **返回结构优化**：每条资讯带 `source` 字段、增加 `highlight` 头条区

## 2. 验收标准

- [ ] `server/config/tech-news.json` 配置文件，可配置 sources（源站域名）和 stocks（行业/个股/市场）
- [ ] Prompt 改为按 5 个场景栏目输出，不再用旧的通用AI/AI编程/AI金融分类
- [ ] 每条资讯必须包含 `url` + `source` 字段，且 url 仅限于配置的源站域名
- [ ] 增加 `highlight` 字段（今日头条 1-2 条）
- [ ] 股票投资模块按配置的行业/个股/市场生成内容
- [ ] AI 返回的链接必须真实可访问，prompt 中禁止捏造 URL
- [ ] 所有内容以中文输出
- [ ] JSON 解析失败时有 fallback 降级
- [ ] EJS 模板适配新结构：头条区、5 个场景栏目、股票投资卡片

## 3. 设计方案

### 3.1 配置文件

新建 `server/config/tech-news.json`：

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

### 3.2 后端改动

**`server/services/ai.js`** — `generateTechNews` 重构：
- 启动时读取 `server/config/tech-news.json`
- Prompt 重构为 5 个场景栏目（含股票投资）
- 将 sources 列表传入 prompt，要求 AI 仅使用这些域名的链接
- 将 stocks 配置传入 prompt
- 返回结构增加 `highlight`、每条 items 增加 `source`
- JSON 解析失败时降级返回

**`server/templates/tech-news.ejs`** — 模板重构：
- 顶部展示 highlight 头条区
- 按 5 个栏目分类渲染
- 股票投资模块用特殊卡片样式

### 3.3 返回结构定义

```json
{
  "date": "2026-07-15",
  "subject": "AI技术前沿早报 - 2026-07-15",
  "highlight": [
    {
      "title": "重点新闻标题",
      "summary": "简要摘要",
      "url": "https://36kr.com/...",
      "source": "36氪"
    }
  ],
  "sections": [
    {
      "name": "今日关注",
      "icon": "🔥",
      "items": [
        {
          "title": "新闻标题",
          "summary": "摘要，50-100字",
          "url": "https://...",
          "source": "来源名"
        }
      ]
    },
    {
      "name": "技术前沿",
      "icon": "⚡",
      "items": []
    },
    {
      "name": "应用落地",
      "icon": "🚀",
      "items": []
    },
    {
      "name": "行业观察",
      "icon": "💡",
      "items": []
    },
    {
      "name": "股票投资",
      "icon": "📈",
      "items": []
    }
  ]
}
```

## 4. 实现计划

### Task 1: 创建配置文件
- 新建 `server/config/tech-news.json`，包含 sources 和 stocks

### Task 2: 重构 ai.js generateTechNews
- 读取配置文件
- 重写 prompt：5 栏目 + 源站约束 + 股票配置驱动
- 返回结构增加 highlight + sections
- JSON 解析 fallback

### Task 3: 重构 EJS 模板
- 头条区高亮展示
- 按 5 个栏目分组渲染
- 股票投资特殊卡片样式

## 5. 变更清单

（实现后自动填充）
