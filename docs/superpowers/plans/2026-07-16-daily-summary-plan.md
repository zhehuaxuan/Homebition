# 每日总结模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现每日总结模块，支持 17:40 定时邮件提醒、回复邮件自动解析入库、前端查看/编辑历史日报。

**Architecture:** 后端新增 daily_summary 表、CRUD 服务层、REST API 路由、基于 node-cron 的定时提醒服务、基于 IMAP 的邮件回复轮询服务。前端在「关于我」下新增 DailySummary.vue 子页面。

**Tech Stack:** Express 5 + MySQL 8 + node-cron + nodemailer + EJS + `imap` + `mailparser` + Vue 3 + Element Plus

## Global Constraints

- 新表名：`daily_summary`，使用 InnoDB 引擎、utf8mb4 字符集
- API 前缀统一为 `/api/daily-summary`
- 所有 API 需经过 token 认证中间件（`middleware/auth.js`）
- 前端组件使用 Element Plus，遵循 About.vue 现有的深色主题风格
- 日期格式统一为 `YYYY-MM-DD`
- 邮件标题格式：`Homebition 工作日报 - YYYY-MM-DD`
- 只处理来自管理员邮箱（环境变量 `MAIL_USER`）的回复邮件

---

### Task 1: 数据库建表 + 依赖安装

**Files:**
- Create: （直接修改 `server/index.js` 加上建表初始化）
- Modify: `server/index.js`（+ 建表调用）

**Interfaces:**
- Consumes: 无
- Produces: `daily_summary` 表就绪

- [ ] **Step 1: 新增 IMAP 相关 npm 依赖**

在 `server/` 目录下安装：

```bash
cd server
npm install imap mailparser
```

说明：`imap` 用于连接阿里云邮箱 IMAP 服务，`mailparser` 用于解析邮件正文（处理 multipart 格式）。

- [ ] **Step 2: 在 server/index.js 中添加建表初始化**

在 `index.js` 中 `articleRouter.initArticleTable(pool);` 之后，添加：

```js
// 8.5 初始化每日总结表
const dailySummaryRouter = require('./routes/dailySummary');
dailySummaryRouter.initDailySummaryTable(pool);
```

`routes/dailySummary.js` 的 `initDailySummaryTable` 方法内容：

```js
async function initDailySummaryTable(pool) {
    const sql = `CREATE TABLE IF NOT EXISTS daily_summary (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      date          DATE NOT NULL UNIQUE,
      work_progress TEXT,
      next_plan     TEXT,
      risk_items    TEXT,
      submitted_at  DATETIME DEFAULT NULL,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    const connection = await pool.getConnection();
    await connection.query(sql);
    connection.release();
    logger.info('[dailySummary] 数据库表已初始化');
}
```

- [ ] **Step 3: 手动验证**

启动后端，检查 `daily_summary` 表已创建：

```bash
mysql -u root -p homebition -e "DESC daily_summary;"
```

---

### Task 2: 后端服务层 — services/dailySummary.js

**Files:**
- Create: `server/services/dailySummary.js`

**Interfaces:**
- Produces: `getList(pool)`, `getByDate(pool, date)`, `upsert(pool, date, data)`, `deleteByDate(pool, date)`

- [ ] **Step 1: 创建 `server/services/dailySummary.js`**

完整内容：

```js
const logger = require('./logger');

/**
 * 获取所有日报列表（按日期降序）
 */
async function getList(pool) {
    const sql = 'SELECT * FROM daily_summary ORDER BY date DESC';
    const [rows] = await pool.query(sql);
    return rows;
}

/**
 * 获取指定日期的日报
 */
async function getByDate(pool, date) {
    const sql = 'SELECT * FROM daily_summary WHERE date = ?';
    const [rows] = await pool.query(sql, [date]);
    return rows[0] || null;
}

/**
 * 插入或更新日报（upsert）
 * @param {object} pool - 数据库连接池
 * @param {string} date - 日期 YYYY-MM-DD
 * @param {object} data - { work_progress, next_plan, risk_items }
 */
async function upsert(pool, date, data) {
    const existing = await getByDate(pool, date);
    if (existing) {
        const sql = `UPDATE daily_summary 
                     SET work_progress = ?, next_plan = ?, risk_items = ?
                     WHERE date = ?`;
        await pool.query(sql, [data.work_progress || null, data.next_plan || null, data.risk_items || null, date]);
        logger.info(`[dailySummary] 更新日报: ${date}`);
    } else {
        const sql = `INSERT INTO daily_summary (date, work_progress, next_plan, risk_items, submitted_at)
                     VALUES (?, ?, ?, ?, NOW())`;
        await pool.query(sql, [date, data.work_progress || null, data.next_plan || null, data.risk_items || null]);
        logger.info(`[dailySummary] 新增日报: ${date}`);
    }
    return getByDate(pool, date);
}

/**
 * 删除指定日期的日报
 */
async function deleteByDate(pool, date) {
    const sql = 'DELETE FROM daily_summary WHERE date = ?';
    const [result] = await pool.query(sql, [date]);
    return result.affectedRows > 0;
}

module.exports = { getList, getByDate, upsert, deleteByDate };
```

- [ ] **Step 2: 手动验证（后续 Task 3 完成后通过 curl 测试）**

---

### Task 3: 后端路由 — routes/dailySummary.js

**Files:**
- Create: `server/routes/dailySummary.js`
- Modify: `server/index.js`（路由挂载）

**Interfaces:**
- Consumes: `services/dailySummary.js` 的 `getList`, `getByDate`, `upsert`, `deleteByDate`
- Produces: 4 个 REST API 端点

- [ ] **Step 1: 创建 `server/routes/dailySummary.js`**

```js
const express = require('express');
const router = express.Router();
const logger = require('../services/logger');
const dailySummary = require('../services/dailySummary');

// ======================================
// GET /api/daily-summary — 获取所有日报列表
// ======================================
router.get('/daily-summary', async (req, res) => {
    try {
        const rows = await dailySummary.getList(req.db);
        res.json({ code: 0, data: rows });
    } catch (err) {
        logger.error('[dailySummary] 查询列表失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// GET /api/daily-summary/:date — 获取指定日期的日报
// ======================================
router.get('/daily-summary/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const row = await dailySummary.getByDate(req.db, date);
        if (!row) {
            return res.status(404).json({ code: 404, message: '日报不存在' });
        }
        res.json({ code: 0, data: row });
    } catch (err) {
        logger.error('[dailySummary] 查询详情失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// PUT /api/daily-summary/:date — 新增或更新日报（upsert）
// ======================================
router.put('/daily-summary/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { work_progress, next_plan, risk_items } = req.body;
        const result = await dailySummary.upsert(req.db, date, { work_progress, next_plan, risk_items });
        res.json({ code: 0, message: '保存成功', data: result });
    } catch (err) {
        logger.error('[dailySummary] 保存失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// DELETE /api/daily-summary/:date — 删除指定日期的日报
// ======================================
router.delete('/daily-summary/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const deleted = await dailySummary.deleteByDate(req.db, date);
        if (!deleted) {
            return res.status(404).json({ code: 404, message: '日报不存在' });
        }
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        logger.error('[dailySummary] 删除失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// 建表初始化
async function initDailySummaryTable(pool) {
    const sql = `CREATE TABLE IF NOT EXISTS daily_summary (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      date          DATE NOT NULL UNIQUE,
      work_progress TEXT,
      next_plan     TEXT,
      risk_items    TEXT,
      submitted_at  DATETIME DEFAULT NULL,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    const connection = await pool.getConnection();
    await connection.query(sql);
    connection.release();
    logger.info('[dailySummary] 数据库表已初始化');
}

module.exports = router;
module.exports.initDailySummaryTable = initDailySummaryTable;
```

- [ ] **Step 2: 在 `server/index.js` 中挂载路由**

在第 5 节（加载路由）的最后，`app.use('/api', investRouter);` 之后添加：

```js
const dailySummaryRouter = require('./routes/dailySummary');
app.use('/api', dailySummaryRouter);
```

- [ ] **Step 3: 手动验证 API（重启后端后）**

```bash
# 创建一条日报
curl -X PUT http://localhost:3000/api/daily-summary/2026-07-16 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(echo -n 'admin:xxx' | base64)" \
  -d '{"work_progress":"完成了需求分析","next_plan":"开始开发","risk_items":"无"}'

# 查询列表
curl http://localhost:3000/api/daily-summary \
  -H "Authorization: Bearer $(echo -n 'admin:xxx' | base64)"

# 查询详情
curl http://localhost:3000/api/daily-summary/2026-07-16 \
  -H "Authorization: Bearer $(echo -n 'admin:xxx' | base64)"

# 删除
curl -X DELETE http://localhost:3000/api/daily-summary/2026-07-16 \
  -H "Authorization: Bearer $(echo -n 'admin:xxx' | base64)"
```

---

### Task 4: 邮件模板 — templates/daily-summary.ejs

**Files:**
- Create: `server/templates/daily-summary.ejs`

**Interfaces:**
- Consumes: 模板数据 `{ date }`
- Produces: 可被 `services/mail.js` 渲染的 EJS 模板文件

- [ ] **Step 1: 创建 `server/templates/daily-summary.ejs`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; }
    .header .date { margin-top: 8px; font-size: 14px; opacity: 0.9; }
    .content { background: white; padding: 24px 20px; border-radius: 0 0 12px 12px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; color: #333; padding-bottom: 8px; border-bottom: 2px solid #667eea; margin-bottom: 12px; }
    .section-content { font-size: 14px; color: #999; line-height: 1.8; padding: 12px; background: #fafafa; border-radius: 8px; min-height: 60px; white-space: pre-wrap; }
    .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>今日工作日报</h1>
      <div class="date"><%= date %></div>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">📋 本日工作任务及进展</div>
        <div class="section-content"></div>
      </div>
      <div class="section">
        <div class="section-title">🎯 下一步工作内容</div>
        <div class="section-content"></div>
      </div>
      <div class="section">
        <div class="section-title">⚠️ 关键遗留风险项</div>
        <div class="section-content"></div>
      </div>
    </div>
    <div class="footer">
      请您直接回复此邮件，在对应章节填入今日内容。<br>
      系统会自动识别您的回复并进行记录。无需修改邮件标题。
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: 在 `server/config/mail.js` 中确认管理员邮箱**

确保 `MAIL_USER` 已正确配置为你的阿里云邮箱地址，因为后续 IMAP 轮询会以此邮箱地址识别有效的回复邮件。

---

### Task 5: 定时提醒服务 — services/dailySummaryReminder.js

**Files:**
- Create: `server/services/dailySummaryReminder.js`
- Modify: `server/index.js`（初始化提醒服务）

**Interfaces:**
- Consumes: `services/mail.js` 的 `sendMail()`，`templates/daily-summary.ejs`
- Produces: 工作日 17:40 发送日报提醒邮件

- [ ] **Step 1: 创建 `server/services/dailySummaryReminder.js`**

```js
const cron = require('node-cron');
const logger = require('./logger');

let reminderRunning = false;

/**
 * 发送日报提醒邮件
 */
async function sendDailyReminder() {
    const { sendMail } = require('./mail');
    const mailConfig = require('../config/mail');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    try {
        await sendMail({
            to: mailConfig.user,
            subject: `Homebition 工作日报 - ${dateStr}`,
            template: 'daily-summary.ejs',
            data: { date: dateStr }
        });
        logger.info(`[dailySummary] 日报提醒邮件已发送: ${dateStr}`);
    } catch (err) {
        logger.error('[dailySummary] 发送日报提醒邮件失败', { error: err.message });
    }
}

/**
 * 初始化日报提醒定时器
 */
function initReminder() {
    if (reminderRunning) {
        logger.warn('[dailySummary] 提醒定时器已在运行');
        return;
    }

    // 工作日（周一至周五）17:40 发送
    cron.schedule('40 17 * * 1-5', async () => {
        logger.info('[dailySummary] 触发日报提醒定时任务');
        await sendDailyReminder();
    });

    reminderRunning = true;
    logger.info('[dailySummary] 日报提醒定时器已启动（工作日 17:40）');
}

module.exports = { initReminder };
```

- [ ] **Step 2: 在 `server/index.js` 中初始化提醒服务**

在 `initScheduler(pool);`（第 93 行附近）之后添加：

```js
// 9. 初始化日报提醒定时器
const { initReminder } = require('./services/dailySummaryReminder');
initReminder();
```

- [ ] **Step 3: 手动验证**

重启后端，观察日志输出 `[dailySummary] 日报提醒定时器已启动（工作日 17:40）`。

---

### Task 6: IMAP 轮询服务 — services/imapPoller.js

**Files:**
- Create: `server/services/imapPoller.js`
- Modify: `server/index.js`（初始化 IMAP 轮询）

**Interfaces:**
- Consumes: `services/dailySummary.js` 的 `upsert()`
- Produces: 解析用户回复的邮件正文并写入 `daily_summary` 表

- [ ] **Step 1: 创建 `server/services/imapPoller.js`**

```js
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const logger = require('./logger');

let pollerRunning = false;
let imapInterval = null;

/**
 * 解析邮件正文，提取三段内容
 */
function parseDailyReply(body) {
    // 去除引用内容（分隔线之后的部分）
    const cleanBody = body
        .split(/---[\s\S]*/)[0]        // 去掉 --- 分隔线及之后的内容
        .split(/-----Original Message-----[\s\S]*/)[0]  // 去掉引用原文
        .trim();

    // 以三个标题行分割
    const workMatch = cleanBody.match(/本日工作任务及进展：([\s\S]*?)(?=下一步工作内容：|$)/);
    const nextMatch = cleanBody.match(/下一步工作内容：([\s\S]*?)(?=关键遗留风险项：|$)/);
    const riskMatch = cleanBody.match(/关键遗留风险项：([\s\S]*?)$/);

    const workProgress = workMatch ? workMatch[1].trim() : '';
    const nextPlan = nextMatch ? nextMatch[1].trim() : '';
    const riskItems = riskMatch ? riskMatch[1].trim() : '';

    return { work_progress: workProgress || null, next_plan: nextPlan || null, risk_items: riskItems || null };
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

/**
 * 处理一封匹配的日报回复邮件
 */
async function processEmail(mail, pool) {
    try {
        const parsed = await simpleParser(mail);
        const subject = parsed.subject || '';
        const from = parsed.from ? parsed.from.text : '';

        // 只处理来自管理员邮箱的回复
        const mailConfig = require('../config/mail');
        const adminEmail = mailConfig.user;
        if (!from.includes(adminEmail)) {
            return;
        }

        // 匹配标题: Re: Homebition 工作日报 - YYYY-MM-DD
        const subjectMatch = subject.match(/Homebition 工作日报 - (\d{4}-\d{2}-\d{2})/);
        if (!subjectMatch) {
            return;
        }

        const date = subjectMatch[1];
        const text = parsed.text || parsed.html || '';

        if (!text.trim()) {
            logger.warn(`[imapPoller] 日报回复内容为空: ${date}`);
            return;
        }

        const data = parseDailyReply(text);

        // 至少有一个字段不为空才写入
        if (!data.work_progress && !data.next_plan && !data.risk_items) {
            logger.warn(`[imapPoller] 日报回复格式无效，跳过: ${date}`);
            return;
        }

        const dailySummary = require('./dailySummary');
        await dailySummary.upsert(pool, date, data);
        logger.info(`[imapPoller] 日报已自动入库: ${date}`);
    } catch (err) {
        logger.error('[imapPoller] 处理邮件出错', { error: err.message });
    }
}

/**
 * 连接 IMAP 并搜索未读的日报回复邮件
 */
function checkInbox(pool) {
    const mailConfig = require('../config/mail');

    const imap = new Imap({
        user: mailConfig.user,
        password: mailConfig.pass,
        host: 'imap.aliyun.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                logger.error('[imapPoller] 打开收件箱失败', { error: err.message });
                imap.end();
                return;
            }

            // 搜索最近 1 天的未读邮件，标题包含"Homebition 工作日报"
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            imap.search([['SINCE', yesterday], ['SUBJECT', 'Homebition 工作日报'], ['UNSEEN']], (searchErr, results) => {
                if (searchErr) {
                    logger.error('[imapPoller] 搜索邮件失败', { error: searchErr.message });
                    imap.end();
                    return;
                }

                if (!results || results.length === 0) {
                    imap.end();
                    return;
                }

                logger.info(`[imapPoller] 发现 ${results.length} 封日报回复邮件`);

                const fetch = imap.fetch(results, { bodies: '' });
                let processedCount = 0;

                fetch.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        let buffer = '';
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf-8');
                        });
                        stream.on('end', async () => {
                            // 构造成 mailparser 可识别的对象
                            const rawEmail = { raw: buffer };
                            await processEmail(rawEmail, pool);
                            processedCount++;
                        });
                    });
                });

                fetch.once('end', () => {
                    // 标记为已读（无需额外操作，因为 search 本身就包含 UNSEEN）
                    imap.end();
                    if (processedCount > 0) {
                        logger.info(`[imapPoller] 本次轮询处理完成: ${processedCount} 封`);
                    }
                });
            });
        });
    });

    imap.once('error', (err) => {
        logger.error('[imapPoller] IMAP 连接错误', { error: err.message });
    });

    imap.once('end', () => {
        // 正常断开
    });

    imap.connect();
}

/**
 * 初始化 IMAP 轮询
 */
function initPoller(pool) {
    if (pollerRunning) {
        logger.warn('[imapPoller] 轮询服务已在运行');
        return;
    }

    // 每 5 分钟轮询一次
    checkInbox(pool); // 启动时立即检查一次
    imapInterval = setInterval(() => checkInbox(pool), 5 * 60 * 1000);

    pollerRunning = true;
    logger.info('[imapPoller] 日报邮件轮询服务已启动（每5分钟一次）');
}

module.exports = { initPoller };
```

- [ ] **Step 2: 在 `server/index.js` 中初始化轮询服务**

在 `initReminder();` 之后添加：

```js
// 10. 初始化 IMAP 日报邮件轮询
const { initPoller } = require('./services/imapPoller');
if (mailConfig.enabled) {
    initPoller(pool);
}
```

注意：需要确保 `mailConfig` 变量在前面已定义。查看 index.js 第 84 行已经有 `const mailConfig = require('./config/mail');`，所以直接引用即可。

- [ ] **Step 3: 手动验证**

重启后端，观察日志输出 `[imapPoller] 日报邮件轮询服务已启动（每5分钟一次）`。

手动发送一封测试邮件到自己的阿里云邮箱，标题为 `Re: Homebition 工作日报 - 2026-07-16`，内容按模板格式填写三个章节，等待触发轮询或主动检查日志。

---

### Task 7: 前端页面 — DailySummary.vue

**Files:**
- Create: `client/src/views/about/DailySummary.vue`

**Interfaces:**
- Consumes: `GET/PUT/DELETE /api/daily-summary`
- Produces: 完整的日报管理页面

- [ ] **Step 1: 创建 `client/src/views/about/DailySummary.vue`**

```vue
<template>
  <div class="page-container">
    <h2 class="page-title">每日总结</h2>

    <!-- 列表模式 -->
    <template v-if="!currentDetail">
      <div v-if="loading" class="loading-text">加载中...</div>
      <div v-else-if="list.length === 0" class="empty-text">暂无日报记录</div>
      <template v-else>
        <div class="summary-list">
          <div
            v-for="item in list"
            :key="item.date"
            class="summary-card"
            @click="viewDetail(item)"
          >
            <div class="card-header">
              <span class="card-date">{{ item.date }}</span>
              <span class="card-status" :class="item.submitted_at ? 'submitted' : ''">
                {{ item.submitted_at ? '已提交' : '未提交' }}
              </span>
            </div>
            <div class="card-preview">
              <div v-if="item.work_progress" class="preview-line">
                <span class="preview-label">进展：</span>
                <span class="preview-text">{{ truncate(item.work_progress, 60) }}</span>
              </div>
              <div v-else class="preview-line empty">暂未填写</div>
            </div>
            <div class="card-footer">
              <span v-if="item.submitted_at" class="card-time">
                提交于 {{ formatTime(item.submitted_at) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- 详情/编辑模式 -->
    <template v-else>
      <div class="detail-header">
        <el-button text @click="backToList">
          ← 返回列表
        </el-button>
        <span class="detail-title">{{ currentDetail.date }} 日报</span>
      </div>

      <div class="detail-form">
        <div class="form-section">
          <label class="form-label">📋 本日工作任务及进展</label>
          <el-input
            v-model="editForm.work_progress"
            type="textarea"
            :rows="4"
            placeholder="请填写今日完成的工作任务及进展"
            :disabled="!isEditing"
          />
        </div>
        <div class="form-section">
          <label class="form-label">🎯 下一步工作内容</label>
          <el-input
            v-model="editForm.next_plan"
            type="textarea"
            :rows="4"
            placeholder="请填写下一步工作计划"
            :disabled="!isEditing"
          />
        </div>
        <div class="form-section">
          <label class="form-label">⚠️ 关键遗留风险项</label>
          <el-input
            v-model="editForm.risk_items"
            type="textarea"
            :rows="4"
            placeholder="请填写需要关注的风险事项"
            :disabled="!isEditing"
          />
        </div>

        <div class="detail-actions">
          <template v-if="isEditing">
            <el-button type="primary" @click="saveEdit">保存</el-button>
            <el-button @click="cancelEdit">取消</el-button>
          </template>
          <template v-else>
            <el-button type="primary" @click="startEdit">编辑</el-button>
            <el-button type="danger" @click="confirmDelete">删除</el-button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const list = ref([])
const loading = ref(true)
const currentDetail = ref(null)
const isEditing = ref(false)
const editForm = ref({ work_progress: '', next_plan: '', risk_items: '' })

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await axios.get('/api/daily-summary')
    if (data.code === 0) {
      list.value = data.data
    }
  } catch (err) {
    console.error('获取日报列表失败', err)
    ElMessage.error('获取日报列表失败')
  } finally {
    loading.value = false
  }
}

const viewDetail = (item) => {
  currentDetail.value = item
  editForm.value = {
    work_progress: item.work_progress || '',
    next_plan: item.next_plan || '',
    risk_items: item.risk_items || ''
  }
  isEditing.value = false
}

const backToList = () => {
  currentDetail.value = null
  isEditing.value = false
}

const startEdit = () => {
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editForm.value = {
    work_progress: currentDetail.value.work_progress || '',
    next_plan: currentDetail.value.next_plan || '',
    risk_items: currentDetail.value.risk_items || ''
  }
}

const saveEdit = async () => {
  if (!editForm.value.work_progress && !editForm.value.next_plan && !editForm.value.risk_items) {
    ElMessage.warning('至少填写一项内容')
    return
  }
  try {
    const { data } = await axios.put(`/api/daily-summary/${currentDetail.value.date}`, editForm.value)
    if (data.code === 0) {
      ElMessage.success('保存成功')
      isEditing.value = false
      // 刷新列表和当前详情
      await fetchList()
      currentDetail.value = data.data
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + (err.response?.data?.message || err.message))
  }
}

const confirmDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除此日报吗？', '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    const { data } = await axios.delete(`/api/daily-summary/${currentDetail.value.date}`)
    if (data.code === 0) {
      ElMessage.success('删除成功')
      backToList()
      await fetchList()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const truncate = (text, len) => {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '...' : text
}

const formatTime = (time) => {
  if (!time) return ''
  return time.slice(0, 19).replace('T', ' ')
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}
.page-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}
.loading-text, .empty-text {
  color: #94a3b8;
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
}
.summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.summary-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.summary-card:hover {
  border-color: #409eff;
  background: #1a2332;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.card-date {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
}
.card-status {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  color: #94a3b8;
  background: #334155;
}
.card-status.submitted {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}
.card-preview {
  margin-bottom: 8px;
}
.preview-line {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
}
.preview-line.empty {
  color: #64748b;
  font-style: italic;
}
.preview-label {
  color: #94a3b8;
}
.card-footer {
  display: flex;
  justify-content: flex-end;
}
.card-time {
  font-size: 12px;
  color: #64748b;
}
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}
.detail-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #cbd5e1;
}
.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
</style>
```

---

### Task 8: 前端路由与导航集成

**Files:**
- Modify: `client/src/router/index.js`
- Modify: `client/src/views/About.vue`

**Interfaces:**
- Consumes: DailySummary.vue 组件
- Produces: 可在浏览器中访问 `/about/daily-summary` 查看日报

- [ ] **Step 1: 在 `client/src/router/index.js` 中添加路由**

在 `/about` 子路由的 children 数组中，在 `subscription-list` 之后添加：

```js
{
  path: 'daily-summary',
  name: 'DailySummary',
  component: () => import('../views/about/DailySummary.vue')
},
```

- [ ] **Step 2: 在 `client/src/views/About.vue` 的 sidebar 中添加导航项**

在订阅管理 `<li>` 之后添加：

```html
<li>
  <router-link to="/about/daily-summary" class="menu-item">
    <span class="icon">📋</span>
    <span class="text">每日总结</span>
  </router-link>
</li>
```

- [ ] **Step 3: 在 `client/src/views/About.vue` 的 tabs 数组中添加标签项**

在 script setup 的 tabs 数组中添加：

```js
{ to: '/about/daily-summary', label: '日报', icon: '📋' },
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 所有 spec 中提到的功能点在计划中均有对应任务
  - Task 1 → 数据库建表
  - Task 2 → 服务层 CRUD
  - Task 3 → API 接口（列表/详情/更新/删除）
  - Task 4 → EJS 邮件模板
  - Task 5 → 17:40 定时提醒（工作日）
  - Task 6 → IMAP 轮询 + 邮件回复解析
  - Task 7 → 前端页面（列表 + 详情 + 编辑）
  - Task 8 → 路由与导航集成
- [x] **Placeholder scan:** 无 TBD、TODO 或模糊步骤
- [x] **Type consistency:** 函数签名在服务层和路由层保持一致
- [x] **File structure:** 所有文件路径精确，职责清晰
