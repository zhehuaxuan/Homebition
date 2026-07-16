# 每日总结模块设计文档

> **日期**: 2026-07-16
> **文件**: server/routes/dailySummary.js, server/services/dailySummary.js, server/services/imapPoller.js, server/templates/daily-summary.ejs, client/src/views/about/DailySummary.vue
> **表**: daily_summary

## 功能概述

每天 17:40 自动发送日报模板邮件，用户回复邮件后系统自动解析入库。在「关于我」下提供历史日报的查看与编辑功能。

## 整体流程

```
17:40 cron 触发
    ↓
发送日报提醒邮件（含三个空章节的模板）
    ↓
用户回复邮件填写内容
    ↓
IMAP 轮询服务（每5分钟）检测到回复邮件
    ↓
解析邮件正文 → 提取三段内容 → 写入 daily_summary 表
    ↓
前端页面可查看/编辑历史日报
```

## 页面结构

### DailySummary.vue（关于我 → 二级菜单）
- **日报列表**：按日期降序，显示日期、提交状态、提交时间
- **日报详情**：点击展开/跳转详情，展示三个章节内容
- **编辑模式**：可修改已提交的日报内容
- 无需补填/标记缺失日期功能

## 提醒邮件模板（EJS）

**标题**: `Homebition 工作日报 - <%= date %>`

**正文**:
```
本日工作任务及进展：


下一步工作内容：


关键遗留风险项：


---
这是一封由 Homebition 系统自动发送的日报提醒邮件。请直接回复此邮件，在对应章节填入今日内容。系统会自动识别您的回复并进行记录。
```

> **注意**：三个章节标题后各留一个空行，方便用户直接在标题下方填写。
> 邮件末尾的 `---` 分隔线及之后的文字作为解析边界，解析时排除。

## 邮件回复解析规则

当 IMAP 轮询检测到标题为 `Re: Homebition 工作日报 - YYYY-MM-DD` 的邮件时，按以下规则解析正文：

1. **去引用**：移除邮件客户端自动添加的原始邮件引用内容（通常以 `---` 分隔线或 `-----Original Message-----` 开头）
2. **分割提取**：以三个固定标题行作为分界点，提取每个标题后的内容（直到下一个标题或结尾）
3. **去空白**：trim 每个章节的内容，去除首尾空行
4. **校验**：三个章节至少有任意一个不为空则视为有效，全部为空则记录日志并跳过

**用户回复示例**（解析器要提取加粗部分）：

```
本日工作任务及进展：
完成了后台任务管理页面的重构，修复了表格排序 bug
对接了每日总结的数据库接口

下一步工作内容：
开始邮件模板的优化
为日报功能编写单元测试

关键遗留风险项：
项目部署的 CI 配置尚未完成

---
这是一封由 Homebition 系统自动发送的日报提醒邮件...
```

## 数据模型

### daily_summary 表

```sql
CREATE TABLE daily_summary (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  date          DATE NOT NULL UNIQUE,        -- 日报日期
  work_progress TEXT,                        -- 本日工作任务及进展
  next_plan     TEXT,                        -- 下一步工作内容
  risk_items    TEXT,                        -- 关键遗留风险项
  submitted_at  DATETIME DEFAULT NULL,       -- 首次提交时间
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- `date` UNIQUE 约束，同一天只有一条记录
- 未提交时三个内容字段为 NULL
- `submitted_at` 首次提交时间，后续编辑不更新此字段

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/daily-summary` | 获取所有日报列表（按日期降序） |
| GET | `/api/daily-summary/:date` | 获取指定日期的日报详情 |
| PUT | `/api/daily-summary/:date` | 新增或更新日报（upsert） |
| DELETE | `/api/daily-summary/:date` | 删除指定日期的日报 |

## 后端模块划分

### services/dailySummary.js
- 数据库 CRUD 操作
- `getList()`、`getByDate(date)`、`upsert(date, data)`、`deleteByDate(date)`

### services/dailySummaryReminder.js
- 使用 node-cron 定时 `0 40 17 * * 1-5`（工作日 17:40）
- 发送日报提醒邮件
- 调用 `services/mail.js` 的发送接口

### services/imapPoller.js
- 每 5 分钟轮询收件箱
- 识别来自管理员邮箱的回复邮件
- 匹配标识（按标题 `Re: Homebition 工作日报 - <date>`）
- 解析邮件正文内容，提取三段文本
- 调用 `dailySummary.upsert()` 写入数据库

### routes/dailySummary.js
- RESTful API，认证中间件保护
- 前端 CRUD 接口

## 前端模块

### DailySummary.vue
- 位于「关于我」二级菜单下
- 路由路径: `/about/daily-summary`
- 功能:
  - 历史日报列表（分页）
  - 点击查看日报详情
  - 编辑已提交内容
  - 删除单条记录
- 使用 Element Plus 组件

## 需要考虑的事项

1. **邮件回复识别**：通过标题匹配 `Re: Homebition 工作日报 - YYYY-MM-DD` 来识别，避免误解析其他邮件
2. **IMAP 配置**：新增服务器配置项（IMAP host/port/user/pass），只读访问收件箱
3. **邮件正文格式**：用户需按模板三个章节的格式填写，解析依赖固定分隔行
4. **安全性**：只处理来自已验证管理员邮箱的回复邮件
5. **错误处理**：若邮件正文格式不符合预期，记录日志，不阻塞轮询
