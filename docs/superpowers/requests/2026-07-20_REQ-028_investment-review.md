# [REQ-028] 投资复盘模块

**提出日期**: 2026-07-20
**状态**: 待开发
**关联需求**: REQ-026（每日总结）、REQ-025（市场行情真实数据）

## 1. 原始需求

需要一个投资复盘功能，每天打开页面时自动拉取当日四大指数行情数据和关注个股表现，用户通过结构化下拉选择和自由笔记记录对当天市场的感悟，所有数据入库保存，为后续连续性的投资分析积累历史数据。

### 1.1 核心流程

1. **行情自动加载**：进入复盘页自动拉取当日四大指数 + A股全市场成交量 + 关注个股行情
2. **结构化填写**：通过下拉/多选/评分等结构化字段快速记录市场感受
3. **自由笔记**：文本框中写几句当日投资感悟
4. **一键保存**：行情快照 + 复盘内容一起入库
5. **历史查阅**：按日期查看历史复盘记录

### 1.2 行情数据范围

| 数据项 | 来源 | 说明 |
|--------|------|------|
| 上证指数 | 腾讯行情 API `sh000001` | 现价、涨跌幅、成交量 |
| 深证成指 | 腾讯行情 API `sz399001` | 现价、涨跌幅、成交量 |
| 创业板指 | 腾讯行情 API `sz399006` | 现价、涨跌幅、成交量 |
| 科创板指 | 腾讯行情 API `sh000688` | 现价、涨跌幅、成交量 |
| A股全市场成交量 | 上证量 + 深证量 | 合计成交额 |
| 关注个股 | 配置页「关注个股」分组管理 | 名称 + 代码，现价、涨跌幅 |

### 1.3 结构化板块

| # | 板块 | 形式 | 数据字段 |
|---|------|------|----------|
| 1 | 大盘感受 | 单选 | `market_sentiment` |
| 2 | 风险预警 | 多选标签 | `risk_warnings` (JSON数组) |
| 3 | 机会板块 | 多选标签 | `opportunity_sectors` (JSON数组) |
| 4 | 操作计划 | 单选 | `action_plan` |
| 5 | 仓位感受 | 单选 | `position_feeling` |
| 6 | 信心指数 | 评分(1-5星) | `confidence_score` |
| 7 | 自由感想 | 文本框 | `free_notes` |

### 1.4 元数据配置管理

所有下拉/多选的选项内容需可维护，通过独立配置页面增删改：

| 配置分组 | 所在字段 | 示例选项 |
|----------|----------|----------|
| `market_sentiment` | 大盘感受 | 乐观、中性、偏谨慎、悲观、极度风险 |
| `risk_warning` | 风险预警标签 | 大盘风险、科技回调、流动性收紧、政策风险、外部扰动 |
| `opportunity_sector` | 机会板块标签 | 创新药、半导体、AI算力、消费、新能源、金融、其他 |
| `action_plan` | 操作计划 | 加仓、减仓、调仓、观望、小幅试探 |
| `position_feeling` | 仓位感受 | 仓位过重、仓位适中、仓位偏轻 |
| `watchlist` | 关注个股 | 名称 + 股票代码（如 盐津铺子/sz002847） |

### 1.5 数据表

```sql
-- 复盘记录表
CREATE TABLE investment_review (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  review_date     DATE NOT NULL UNIQUE,
  -- 行情快照（JSON）
  market_snapshot JSON,
  -- 结构化复盘内容
  market_sentiment    VARCHAR(50),
  risk_warnings       JSON,
  opportunity_sectors JSON,
  action_plan         VARCHAR(50),
  position_feeling    VARCHAR(50),
  confidence_score    TINYINT,
  free_notes          TEXT,
  -- 时间
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (review_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 复盘配置元数据表
CREATE TABLE review_config (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  group_key   VARCHAR(50) NOT NULL,   -- 配置分组
  label       VARCHAR(100) NOT NULL,  -- 显示名称
  value       VARCHAR(50) DEFAULT NULL, -- 存储值（如股票代码），NULL 则与 label 相同
  sort_order  INT DEFAULT 0,          -- 排序
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_label (group_key, label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1.6 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/invest/review/today` | 获取今日行情 + 今日复盘（已存在则返回，不存在则只返回行情） |
| PUT | `/api/invest/review/:date` | 新增或更新复盘记录 |
| GET | `/api/invest/review` | 获取历史复盘列表 |
| GET | `/api/invest/review/:date` | 获取指定日期复盘详情 |
| DELETE | `/api/invest/review/:date` | 删除指定日期复盘 |
| GET | `/api/review-config/:groupKey` | 获取指定分组的配置选项 |
| PUT | `/api/review-config/:groupKey` | 更新指定分组的配置选项列表 |
| GET | `/api/review-config/groups` | 获取所有配置分组及其选项 |

## 2. 验收标准

- [ ] 进入复盘页自动加载当日四大指数行情 + 成交量 + 个股涨跌
- [ ] 结构化板块可正常下拉/多选/评分，选项来自配置表
- [ ] 自由文本框可输入多行文本
- [ ] 保存后行情快照和复盘内容一同入库
- [ ] 历史复盘列表可查看，支持回看特定日期的复盘
- [ ] 独立配置页面可管理所有分组的下拉选项（增删改）
- [ ] 行情数据暂不可用时（非交易日）有友好提示

## 3. 开放问题

- 非交易日打开复盘页时的处理逻辑（提示今日无行情数据，但仍可记录）
