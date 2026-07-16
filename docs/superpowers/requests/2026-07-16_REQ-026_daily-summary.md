# [REQ-026] 每日总结模块

**提出日期**: 2026-07-16
**状态**: 设计稿
**关联需求**: REQ-021（订阅任务执行引擎）

## 1. 原始需求

需要一个每日总结功能，每天 17:40 自动发送邮件提醒，用户回复邮件后系统自动解析并入库，同时支持在系统内查看和编辑历史日报。

### 1.1 功能流程

1. **定时提醒**：每个工作日（周一至周五）17:40 自动发送一封日报提醒邮件
2. **邮件模板**：标题为 `Homebition 工作日报 - YYYY-MM-DD`，正文包含三个空章节
3. **回复提交**：用户直接回复邮件，在对应章节填入内容后发送
4. **自动解析**：系统通过 IMAP 轮询检测回复邮件，解析正文提取三段内容并写入数据库
5. **前端查阅**：在「关于我」二级菜单下新增「每日总结」页面，支持查看历史日报和编辑已提交内容

### 1.2 邮件模板

三个固定章节：
- 本日工作任务及进展
- 下一步工作内容
- 关键遗留风险项

### 1.3 邮件回复解析

- 匹配标题 `Re: Homebition 工作日报 - YYYY-MM-DD` 识别回复
- 以三个章节标题作为分割点，提取内容
- 移除邮件客户端添加的引用原文（`---` 分隔线或 `-----Original Message-----` 之后的内容）
- 只处理来自管理员邮箱的回复

## 2. 验收标准

- [ ] 新增 `daily_summary` 表（date 唯一约束、三个内容字段、提交时间、更新时间）
- [ ] 后端 CRUD API（列表/详情/更新/删除）
- [ ] 工作日 17:40 自动发送日报提醒邮件
- [ ] IMAP 轮询每 5 分钟检测回复邮件并自动入库
- [ ] 前端「每日总结」页面（列表查看 + 详情展示 + 编辑 + 删除）
- [ ] 在「关于我」侧边栏和手机标签栏中添加「每日总结」导航项

## 3. 设计方案

详见 [daily-summary-module.md](../specs/modules/daily-summary-module.md)

### 3.1 后端模块

| 文件 | 职责 |
|------|------|
| `server/routes/dailySummary.js` | REST API + 建表初始化 |
| `server/services/dailySummary.js` | 数据库 CRUD 操作 |
| `server/services/dailySummaryReminder.js` | 工作日 17:40 定时发送提醒邮件 |
| `server/services/imapPoller.js` | IMAP 轮询接收回复邮件并解析入库 |
| `server/templates/daily-summary.ejs` | 日报提醒邮件模板 |

### 3.2 前端模块

- `client/src/views/about/DailySummary.vue` — 列表页 + 详情页 + 编辑模式

### 3.3 数据表

```sql
CREATE TABLE daily_summary (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  date          DATE NOT NULL UNIQUE,
  work_progress TEXT,
  next_plan     TEXT,
  risk_items    TEXT,
  submitted_at  DATETIME DEFAULT NULL,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.4 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/daily-summary` | 获取所有日报列表 |
| GET | `/api/daily-summary/:date` | 获取指定日期日报详情 |
| PUT | `/api/daily-summary/:date` | 新增或更新日报 |
| DELETE | `/api/daily-summary/:date` | 删除指定日期日报 |

## 4. 开放问题

- 邮件正文解析的健壮性：不同邮件客户端引用格式可能不同，需要测试
- 若某天重复发送多封提醒（如服务重启），需防止重复邮件
