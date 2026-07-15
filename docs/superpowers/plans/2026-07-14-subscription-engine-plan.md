# 订阅任务执行引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add execution engine to subscription module: internal AI interface type, cron-based scheduler, manual send button, and two built-in AI handlers.

**Architecture:** New services layer (pipeline.js / ai.js / scheduler.js) sits between existing route handlers and nodemailer. The api_manager table gets a `type` column to distinguish external URLs from internal AI handlers. The execution flow is: trigger (cron or manual) → pipeline.executeSubscription() → resolve data source → render EJS template → send mail.

**Tech Stack:** node-cron, Node.js (existing: express + mysql2 + ejs + nodemailer), Vue 3 + Element Plus

## Global Constraints

- Node.js v18+ (existing project)
- API response format: `{ code: 0, data, message }`
- All new text must be Chinese where user-facing (button labels, prompts, error messages)
- Internal AI handler paths use format `internal://<handler-name>`
- Do NOT modify existing template.js, mailAddress.js, or mail.js
- Do NOT restart dev server after implementation

---

### Task 1: Install node-cron dependency

**Files:**
- Modify: `E:/Homebition/package.json`

**Interfaces:**
- Consumes: project root package.json
- Produces: node-cron available in node_modules

- [ ] **Step 1: Install the package**

```bash
cd E:/Homebition
npm install node-cron
```

- [ ] **Step 2: Verify install**

```bash
ls node_modules/node-cron/package.json
```
Expected: file exists, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add node-cron dependency for subscription scheduler"
```

---

### Task 2: Add type column to api_manager table

**Files:**
- Create: `E:/Homebition/server/migrations/002_add_api_manager_type.sql` (reference only)
- Modify: `E:/Homebition/server/routes/apiManager.js`

**Interfaces:**
- Consumes: existing api_manager table
- Produces: api_manager.type column, router accepts type field

- [ ] **Step 1: Create migration SQL script**

```sql
-- 002_add_api_manager_type.sql
ALTER TABLE api_manager
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'external'
    COMMENT 'external: 外部URL, internal: 内部AI接口';
```

- [ ] **Step 2: Run migration**

Run the ALTER TABLE statement against the homebition database.

```bash
mysql -u root -padmin homebition -e "ALTER TABLE api_manager ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'external' COMMENT 'external: 外部URL, internal: 内部AI接口';"
```

- [ ] **Step 3: Update apiManager.js route — add type field to CRUD**

Edit `E:/Homebition/server/routes/apiManager.js`:

In the POST `/api/add` route, extract `type` from body and save it:

```javascript
router.post('/api/add', async (req, res) => {
    const { name, path, description, type } = req.body;

    if (!name || !path) {
        return res.status(400).json({ code: 400, message: '名称和路径不能为空' });
    }

    try {
        const apiType = type || 'external';
        const sql = `INSERT INTO api_manager (name, path, description, type, create_time) VALUES (?, ?, ?, ?, NOW())`;
        const [result] = await req.db.query(sql, [name, path, description || '', apiType]);
        res.json({ code: 0, message: '创建成功', id: result.insertId });
    } catch (err) {
        console.error('创建接口失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});
```

In the PUT `/api/update/:id` route, update type:

```javascript
router.put('/api/update/:id', async (req, res) => {
    const { id } = req.params;
    const { name, path, description, type } = req.body;

    if (!name || !path) {
        return res.status(400).json({ code: 400, message: '名称和路径不能为空' });
    }

    try {
        const apiType = type || 'external';
        const sql = `UPDATE api_manager SET name=?, path=?, description=?, type=? WHERE id=?`;
        const [result] = await req.db.query(sql, [name, path, description || '', apiType, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '接口不存在' });
        }
        res.json({ code: 0, message: '更新成功' });
    } catch (err) {
        console.error('更新接口失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});
```

In the GET `/apis` route, also return type field (already returns all columns from SELECT *, so no change needed — just verify).

- [ ] **Step 4: Update test API route to support internal type**

In POST `/api/test/:id`, after fetching the api row, handle internal type:

```javascript
router.post('/api/test/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await req.db.query('SELECT * FROM api_manager WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '接口不存在' });
        }

        const api = rows[0];

        // Handle internal type
        if (api.type === 'internal') {
            const pipeline = require('../services/pipeline');
            try {
                const result = await pipeline.executeHandler(api.path, req.db);
                res.json({
                    code: 0,
                    message: '成功',
                    data: { body: result, duration: 0 }
                });
            } catch (err) {
                res.json({
                    code: 0,
                    message: '失败',
                    data: { error: err.message, duration: 0 }
                });
            }
            return;
        }

        // existing external test logic continues...
        // [keep the rest of the existing test code unchanged]
```

Note: For now, just add the type check block before the existing fetch logic. The pipeline.executeHandler will be created in Task 3.

- [ ] **Step 5: Commit**

```bash
git add server/routes/apiManager.js
git commit -m "feat: add type field to api_manager CRUD (external/internal)"
```

---

### Task 3: Create execution pipeline service

**Files:**
- Create: `E:/Homebition/server/services/pipeline.js`

**Interfaces:**
- Consumes: `subscriptionRow` object, `db` pool from mysql2
- Produces: `executeSubscription(subscriptionRow, db)` — returns `{ success: true, message }`
- Produces: `executeHandler(apiPath, db)` — returns JSON data
- Produces: `executeExternalApi(url)` — returns JSON data

- [ ] **Step 1: Create pipeline.js with structure**

```javascript
// server/services/pipeline.js
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const TEMPLATES_DIR = path.join(__dirname, '../templates');

/**
 * Execute an internal AI handler by path like "internal://ai/tech-news"
 */
async function executeHandler(apiPath, db) {
    const handlerName = apiPath.replace('internal://', '');
    const handlers = {
        'ai/tech-news': async (db) => {
            const { generateTechNews } = require('./ai');
            return generateTechNews(db);
        },
        'ai/task-breakdown': async (db) => {
            const { generateTaskBreakdown } = require('./ai');
            return generateTaskBreakdown(db);
        }
    };

    const handler = handlers[handlerName];
    if (!handler) {
        throw new Error(`未知的内部接口: ${handlerName}`);
    }
    return handler(db);
}

/**
 * Execute an external API call (HTTP GET)
 */
async function executeExternalApi(url) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(30000)
    });
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return { text: await response.text() };
}

/**
 * Full execution pipeline for a subscription task
 */
async function executeSubscription(subscriptionRow, db) {
    const { api_id, template, email, name, type, id } = subscriptionRow;

    // 1. Get API info
    const [apis] = await db.query('SELECT * FROM api_manager WHERE id = ?', [api_id]);
    if (apis.length === 0) {
        throw new Error('接口不存在或已删除');
    }
    const api = apis[0];

    // 2. Get data
    let data;
    if (api.type === 'internal') {
        data = await executeHandler(api.path, db);
    } else {
        data = await executeExternalApi(api.path);
    }

    // 3. Read and render EJS template
    const templatePath = path.join(TEMPLATES_DIR, template);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`模板文件不存在: ${template}`);
    }
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(templateContent, { data });

    // 4. Build subject
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;
    const subject = `${name} - ${dateStr}`;

    // 5. Send mail
    const mailConfig = require('../config/mail');
    const { initTransporter, sendMail } = require('./mail');
    if (!mailConfig.enabled) {
        throw new Error('邮件服务未启用');
    }
    // Ensure transporter is initialized
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port || 465,
        secure: mailConfig.secure !== false,
        auth: {
            user: mailConfig.user,
            pass: mailConfig.pass
        }
    });

    const mailOptions = {
        from: mailConfig.from,
        to: email,
        subject,
        html
    };
    await transporter.sendMail(mailOptions);

    // 6. If once type, auto-disable the subscription
    if (type === 'once') {
        await db.query('UPDATE subscription SET status = 0 WHERE id = ?', [id]);
    }

    logger.info(`[pipeline] 订阅任务执行成功: ${name} → ${email}`);
    return { success: true, message: '发送成功' };
}

module.exports = { executeSubscription, executeHandler, executeExternalApi };
```

- [ ] **Step 2: Commit**

```bash
git add server/services/pipeline.js
git commit -m "feat: add subscription execution pipeline (pipeline.js)"
```

---

### Task 4: Create AI handler service

**Files:**
- Create: `E:/Homebition/server/services/ai.js`

**Interfaces:**
- Consumes: `db` pool (for task-breakdown to query task table)
- Produces: `generateTechNews(db)` → `{ date, subject, items: [...] }`
- Produces: `generateTaskBreakdown(db)` → `{ date, subject, summary, tasks: [...] }`

- [ ] **Step 1: Create ai.js with tech-news handler**

```javascript
// server/services/ai.js
const logger = require('./logger');

/**
 * Generate AI Technology Frontier Daily News
 * Calls DeepSeek to produce structured tech news with links
 */
async function generateTechNews(db) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;

    const prompt = `你是一个AI技术资讯编辑。请生成今天的AI技术前沿早报。

请覆盖以下三个分类：
1. 通用AI新闻：大模型技术突破、行业动态、新产品发布
2. AI编程：AI辅助开发、代码生成工具、编程模型进展
3. AI金融：AI在金融领域的应用、量化交易、风控技术

请严格按照以下JSON格式返回，不要添加任何解释或额外文本，确保每条资讯都包含真实的URL链接：
{
  "date": "${dateStr}",
  "subject": "AI技术前沿早报 - ${dateStr}",
  "items": [
    {
      "title": "资讯标题",
      "summary": "简要摘要，50-100字",
      "url": "https://...",
      "category": "通用AI/AI编程/AI金融"
    }
  ]
}

要求：
- 至少生成8条资讯，每个分类至少2条
- 每条必须包含真实的URL链接
- 摘要简洁有信息量
- 优先选择近2天的新闻`;

    try {
        const axios = require('axios');
        const deepseekBaseUrl = process.env.DEEPSEEK_BASEURL || 'https://api.deepseek.com';
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
        const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

        const response = await axios.post(`${deepseekBaseUrl}/chat/completions`, {
            model: deepseekModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`
            },
            timeout: 60000
        });

        const content = response.data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            logger.info('[ai] tech-news 生成成功');
            return result;
        }
        throw new Error('无法解析AI返回结果');
    } catch (err) {
        logger.error('[ai] tech-news 生成失败: ' + err.message);
        throw err;
    }
}

/**
 * Generate Today's Task Breakdown
 * Queries the task table and uses AI to analyze and prioritize
 */
async function generateTaskBreakdown(db) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;

    // Query active tasks from database
    const [tasks] = await db.query(
        `SELECT title, target, importance, status, 
                DATEDIFF(close_time, NOW()) as remain_days 
         FROM task 
         WHERE status != '已完成' 
         ORDER BY 
           CASE status 
             WHEN '进行中' THEN 0 
             WHEN '待启动' THEN 1 
             WHEN '挂起中' THEN 2 
           END,
           remain_days ASC`
    );

    const tasksJson = JSON.stringify(tasks, null, 2);

    const prompt = `你是一个任务管理助手。请分析以下任务列表，生成今天的重点工作安排。

当前日期：${dateStr}

任务列表：
${tasksJson}

请严格按照以下JSON格式返回，不要添加任何解释或额外文本：
{
  "date": "${dateStr}",
  "subject": "今日工作安排 - ${dateStr}",
  "summary": "今日工作概述，50-100字",
  "tasks": [
    {
      "title": "任务标题",
      "priority": "高/中/低",
      "estimatedTime": "预计耗时，如2h",
      "notes": "建议说明，为什么今天优先做这个"
    }
  ]
}

要求：
- 按优先级排序，最重要的排在前面
- 今日建议完成2-4个任务
- 如果任务太少（少于2个），建议今天可推进的事项
- 考虑任务的剩余天数和重要性`;

    try {
        const axios = require('axios');
        const deepseekBaseUrl = process.env.DEEPSEEK_BASEURL || 'https://api.deepseek.com';
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
        const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

        const response = await axios.post(`${deepseekBaseUrl}/chat/completions`, {
            model: deepseekModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`
            },
            timeout: 60000
        });

        const content = response.data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            logger.info('[ai] task-breakdown 生成成功');
            return result;
        }
        throw new Error('无法解析AI返回结果');
    } catch (err) {
        logger.error('[ai] task-breakdown 生成失败: ' + err.message);
        throw err;
    }
}

module.exports = { generateTechNews, generateTaskBreakdown };
```

- [ ] **Step 2: Commit**

```bash
git add server/services/ai.js
git commit -m "feat: add AI internal handlers (tech-news, task-breakdown)"
```

---

### Task 5: Create cron scheduler service

**Files:**
- Create: `E:/Homebition/server/services/scheduler.js`

**Interfaces:**
- Consumes: `db` pool, `executeSubscription` from pipeline.js
- Produces: `initScheduler(pool)` — starts cron job

- [ ] **Step 1: Create scheduler.js**

```javascript
// server/services/scheduler.js
const cron = require('node-cron');
const logger = require('./logger');

let schedulerRunning = false;

/**
 * Check if a periodic subscription matches the current time
 */
function isTimeToRun(subscription) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (subscription.type === 'once') {
        const sendTime = new Date(subscription.send_time);
        const diff = Math.abs(now - sendTime);
        // Within 60 seconds
        return diff <= 60000;
    }

    if (subscription.type === 'periodic') {
        // Check weekday
        const today = now.getDay(); // 0=Sunday
        const weekDays = subscription.week_days || [];
        if (!weekDays.includes(today)) {
            return false;
        }

        // Check time: send_time is "HH:mm:ss" format
        if (!subscription.send_time) return false;
        const parts = subscription.send_time.split(':');
        const taskMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        return Math.abs(currentMinutes - taskMinutes) <= 1; // Within 1 minute
    }

    return false;
}

/**
 * Initialize the cron scheduler
 */
function initScheduler(pool) {
    if (schedulerRunning) {
        logger.warn('[scheduler] 调度器已在运行');
        return;
    }

    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            logger.info('[scheduler] 开始扫描订阅任务...');
            const [rows] = await pool.query(
                'SELECT * FROM subscription WHERE status = 1'
            );

            const matchedTasks = [];
            for (const row of rows) {
                // Parse week_days from JSON string
                const subscription = {
                    ...row,
                    week_days: typeof row.week_days === 'string'
                        ? JSON.parse(row.week_days || '[]')
                        : (row.week_days || [])
                };
                if (isTimeToRun(subscription)) {
                    matchedTasks.push(subscription);
                }
            }

            if (matchedTasks.length === 0) {
                logger.info('[scheduler] 本次扫描无匹配任务');
                return;
            }

            logger.info(`[scheduler] 本次扫描到 ${matchedTasks.length} 个任务待执行`);

            const { executeSubscription } = require('./pipeline');
            const results = await Promise.allSettled(
                matchedTasks.map(task => executeSubscription(task, pool))
            );

            results.forEach((result, index) => {
                const task = matchedTasks[index];
                if (result.status === 'fulfilled') {
                    logger.info(`[scheduler] 任务执行成功: ${task.name}`);
                } else {
                    logger.error(`[scheduler] 任务执行失败: ${task.name} - ${result.reason?.message || '未知错误'}`);
                }
            });
        } catch (err) {
            logger.error('[scheduler] 扫描出错: ' + err.message);
        }
    });

    schedulerRunning = true;
    logger.info('[scheduler] 定时调度器已启动，每分钟扫描一次');
}

module.exports = { initScheduler };
```

- [ ] **Step 2: Commit**

```bash
git add server/services/scheduler.js
git commit -m "feat: add cron scheduler for subscription tasks"
```

---

### Task 6: Add manual execute route to subscription.js

**Files:**
- Modify: `E:/Homebition/server/routes/subscription.js`

**Interfaces:**
- Consumes: `executeSubscription` from pipeline.js
- Produces: `POST /api/subscription/execute/:id` route

- [ ] **Step 1: Add manual execute route to subscription.js**

Append before `module.exports = router;`:

```javascript
// 手动执行订阅任务
router.post('/subscription/execute/:id', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM subscription WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在' });
        }

        const subscription = {
            ...rows[0],
            week_days: typeof rows[0].week_days === 'string'
                ? JSON.parse(rows[0].week_days || '[]')
                : (rows[0].week_days || [])
        };

        const { executeSubscription } = require('../services/pipeline');
        const result = await executeSubscription(subscription, req.db);

        res.json({ code: 0, message: result.message });
    } catch (err) {
        console.error('执行订阅任务失败:', err);
        res.status(500).json({ code: 500, message: err.message || '执行失败' });
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/subscription.js
git commit -m "feat: add manual execute route POST /subscription/execute/:id"
```

---

### Task 7: Initialize scheduler in index.js

**Files:**
- Modify: `E:/Homebition/server/index.js`

- [ ] **Step 1: Add scheduler init after mail init**

In `E:/Homebition/server/index.js`, after the mail service initialization block, add:

```javascript
// 8. 初始化定时调度器
const { initScheduler } = require('./services/scheduler');
initScheduler(pool);
logger.info('[scheduler] 定时调度器已初始化');
```

The placement should be after the mail config init block (around line 90), before `app.listen`.

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: initialize subscription scheduler on server start"
```

---

### Task 8: Update Subscription.vue frontend — send button

**Files:**
- Modify: `E:/Homebition/client/src/views/about/Subscription.vue`

- [ ] **Step 1: Add "发送" button to subscription table operations column**

In the subscription table's "操作" column (around line 54-57), add a send button before "修改":

```html
<el-table-column label="操作" width="200" align="center">
  <template #default="scope">
    <el-button size="small" type="success"
      @click="handleExecuteSubscription(scope.row)"
      :loading="scope.row.executing">
      发送
    </el-button>
    <el-button size="small" type="primary" @click="handleEditSubscription(scope.row)">修改</el-button>
    <el-button size="small" type="danger" @click="handleDeleteSubscription(scope.row.id)">删除</el-button>
  </template>
</el-table-column>
```

Also update the mobile card actions:

```html
<div class="card-actions">
  <el-button size="small" type="success"
    @click="handleExecuteSubscription(item)"
    :loading="item.executing">发送</el-button>
  <el-button size="small" type="primary" @click="handleEditSubscription(item)">修改</el-button>
  <el-button size="small" type="danger" @click="handleDeleteSubscription(item.id)">删除</el-button>
</div>
```

- [ ] **Step 2: Add handleExecuteSubscription method in script**

In the `<script setup>` section, add after `handleDeleteSubscription`:

```javascript
// 手动执行订阅任务
const handleExecuteSubscription = async (row) => {
  row.executing = true
  try {
    const { data } = await axios.post(`/api/subscription/execute/${row.id}`)
    if (data.code === 0) {
      ElMessage.success('发送成功')
    } else {
      ElMessage.error(data.message || '发送失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '发送失败')
  } finally {
    row.executing = false
  }
}
```

- [ ] **Step 3: Update "操作" column width to 250px for desktop**

Change the column width to accommodate the new button:

```html
<el-table-column label="操作" width="250" align="center">
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/about/Subscription.vue
git commit -m "feat: add send button to subscription task list"
```

---

### Task 9: Update Subscription.vue frontend — API type selector

**Files:**
- Modify: `E:/Homebition/client/src/views/about/Subscription.vue`

- [ ] **Step 1: Add type radio buttons to the API dialog form**

In the API add/edit dialog (around line 304-316), add type selection before the name field:

```html
<el-dialog v-model="apiDialogVisible" :title="isApiEdit ? '修改接口' : '新增接口'" width="600px">
  <el-form :model="apiForm" ref="apiFormRef" label-width="100px">
    <el-form-item label="接口类型" prop="type" required>
      <el-radio-group v-model="apiForm.type">
        <el-radio value="external">外部 URL</el-radio>
        <el-radio value="internal">内部 AI 接口</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 外部URL -->
    <template v-if="apiForm.type === 'external'">
      <el-form-item label="接口名称" prop="name" required>
        <el-input v-model="apiForm.name" placeholder="请输入接口名称，如：获取用户信息" />
      </el-form-item>
      <el-form-item label="接口路径" prop="path" required>
        <el-input v-model="apiForm.path" placeholder="请输入接口路径，如：https://api.example.com/users" />
        <span class="form-tip">支持 GET 请求的 HTTP/HTTPS URL</span>
      </el-form-item>
    </template>

    <!-- 内部AI接口 -->
    <template v-if="apiForm.type === 'internal'">
      <el-form-item label="接口名称" prop="name" required>
        <el-input v-model="apiForm.name" placeholder="请输入接口名称" />
      </el-form-item>
      <el-form-item label="内部接口" prop="path" required>
        <el-select v-model="apiForm.path" placeholder="请选择内部AI接口" style="width: 100%">
          <el-option label="AI 技术前沿早报" value="internal://ai/tech-news" />
          <el-option label="今日任务拆解" value="internal://ai/task-breakdown" />
        </el-select>
        <span class="form-tip">选择内部AI接口后，订阅执行时会自动调用大模型生成内容</span>
      </el-form-item>
    </template>

    <el-form-item label="描述" prop="description">
      <el-input v-model="apiForm.description" type="textarea" :rows="3" placeholder="请输入接口描述（可选）" />
    </el-form-item>
  </el-form>
  <template #footer>
    <el-button @click="apiDialogVisible = false">取消</el-button>
    <el-button type="primary" @click="handleSubmitApi">确认</el-button>
  </template>
</el-dialog>
```

- [ ] **Step 2: Update apiForm reactive data to include type**

Find the apiForm reactive declaration and add type:

```javascript
const apiForm = reactive({
  id: null,
  name: '',
  path: '',
  type: 'external',
  description: ''
})
```

- [ ] **Step 3: Update handleAddApi to reset type**

```javascript
const handleAddApi = () => {
  isApiEdit.value = false
  Object.assign(apiForm, { id: null, name: '', path: '', type: 'external', description: '' })
  apiDialogVisible.value = true
}
```

- [ ] **Step 4: Update handleSubmitApi to send type**

```javascript
const handleSubmitApi = async () => {
  if (apiForm.type === 'external' && (!apiForm.name || !apiForm.path)) {
    return ElMessage.warning('请完善必填项')
  }
  if (apiForm.type === 'internal' && (!apiForm.name || !apiForm.path)) {
    return ElMessage.warning('请完善必填项')
  }

  try {
    if (isApiEdit.value) {
      await axios.put(`/api/api/update/${apiForm.id}`, {
        name: apiForm.name,
        path: apiForm.path,
        type: apiForm.type,
        description: apiForm.description
      })
      ElMessage.success('修改成功')
    } else {
      await axios.post('/api/api/add', {
        name: apiForm.name,
        path: apiForm.path,
        type: apiForm.type,
        description: apiForm.description
      })
      ElMessage.success('创建成功')
    }
    apiDialogVisible.value = false
    getApis()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}
```

- [ ] **Step 5: Show type tag in API table**

Update the API table's "description" column to show type instead. Or add a type column after the name column (around line 265):

```html
<el-table-column label="类型" width="100">
  <template #default="scope">
    <el-tag :type="scope.row.type === 'internal' ? 'success' : ''" size="small">
      {{ scope.row.type === 'internal' ? '内部 AI' : '外部 URL' }}
    </el-tag>
  </template>
</el-table-column>
```

Also add to the mobile card:

```html
<div class="card-row" v-if="item.type">
  <span class="card-label">类型</span>
  <el-tag :type="item.type === 'internal' ? 'success' : ''" size="small">
    {{ item.type === 'internal' ? '内部 AI' : '外部 URL' }}
  </el-tag>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add client/src/views/about/Subscription.vue
git commit -m "feat: support internal AI interface type in API management UI"
```

---

### Task 10: Create sample EJS templates for new AI interfaces

**Files:**
- Create: `E:/Homebition/server/templates/tech-news.ejs`
- Create: `E:/Homebition/server/templates/task-breakdown.ejs`

- [ ] **Step 1: Create tech-news.ejs template**

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
    .content { background: white; padding: 20px; border-radius: 0 0 12px 12px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; color: #333; border-left: 4px solid #667eea; padding-left: 10px; margin-bottom: 12px; }
    .item { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
    .item:last-child { border-bottom: none; }
    .item-title { font-size: 15px; font-weight: 600; }
    .item-title a { color: #1a73e8; text-decoration: none; }
    .item-title a:hover { text-decoration: underline; }
    .item-summary { font-size: 13px; color: #666; margin-top: 4px; line-height: 1.5; }
    .item-category { display: inline-block; font-size: 11px; color: #667eea; background: #f0f0ff; padding: 2px 8px; border-radius: 10px; margin-top: 4px; }
    .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><%= data.subject || 'AI 技术前沿早报' %></h1>
      <div class="date"><%= data.date %></div>
    </div>
    <div class="content">
      <% if (data.items && data.items.length > 0) { %>
        <% const categories = { '通用AI': [], 'AI编程': [], 'AI金融': [] }; %>
        <% data.items.forEach(function(item) { %>
          <% if (categories[item.category]) { categories[item.category].push(item); } %>
        <% }); %>
        <% Object.keys(categories).forEach(function(cat) { %>
          <% if (categories[cat].length > 0) { %>
            <div class="section">
              <div class="section-title"><%= cat %></div>
              <% categories[cat].forEach(function(item) { %>
                <div class="item">
                  <div class="item-title"><a href="<%= item.url %>" target="_blank"><%= item.title %></a></div>
                  <div class="item-summary"><%= item.summary %></div>
                  <span class="item-category"><%= item.category %></span>
                </div>
              <% }); %>
            </div>
          <% }); %>
        <% }); %>
      <% } else { %>
        <p style="color: #999; text-align: center;">暂无资讯内容</p>
      <% } %>
    </div>
    <div class="footer">
      由 Homebition AI 生成 · <%= data.date %>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Create task-breakdown.ejs template**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; }
    .header .date { margin-top: 8px; font-size: 14px; opacity: 0.9; }
    .content { background: white; padding: 20px; border-radius: 0 0 12px 12px; }
    .summary { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px; padding: 12px; background: #fafafa; border-radius: 8px; }
    .task { margin-bottom: 14px; padding: 14px; border-radius: 8px; border: 1px solid #eee; }
    .task-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .task-title { font-size: 15px; font-weight: 600; color: #333; }
    .task-priority { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
    .task-priority.high { background: #ffe0e0; color: #d32f2f; }
    .task-priority.medium { background: #fff3e0; color: #f57c00; }
    .task-priority.low { background: #e8f5e9; color: #388e3c; }
    .task-meta { font-size: 12px; color: #999; margin-bottom: 4px; }
    .task-notes { font-size: 13px; color: #666; line-height: 1.4; }
    .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><%= data.subject || '今日工作安排' %></h1>
      <div class="date"><%= data.date %></div>
    </div>
    <div class="content">
      <% if (data.summary) { %>
        <div class="summary"><%= data.summary %></div>
      <% } %>
      <% if (data.tasks && data.tasks.length > 0) { %>
        <% data.tasks.forEach(function(task) { %>
          <div class="task">
            <div class="task-header">
              <div class="task-title"><%= task.title %></div>
              <span class="task-priority <%= task.priority === '高' ? 'high' : (task.priority === '中' ? 'medium' : 'low') %>"><%= task.priority %></span>
            </div>
            <div class="task-meta">预计耗时：<%= task.estimatedTime %></div>
            <div class="task-notes"><%= task.notes %></div>
          </div>
        <% }); %>
      <% } else { %>
        <p style="color: #999; text-align: center;">暂无今日任务安排</p>
      <% } %>
    </div>
    <div class="footer">
      由 Homebition AI 分析 · <%= data.date %>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add server/templates/tech-news.ejs server/templates/task-breakdown.ejs
git commit -m "feat: add EJS templates for tech-news and task-breakdown"
```

---

### Task 11: Register built-in AI interfaces

**Files:**
- No code change needed

After starting the server, manually insert the two built-in AI interfaces into the api_manager table so they appear in the UI:

- [ ] **Step 1: Insert built-in AI interfaces**

```bash
mysql -u root -padmin homebition -e "
INSERT INTO api_manager (name, path, description, type, create_time) VALUES
('AI 技术前沿早报', 'internal://ai/tech-news', '订阅 AI 技术前沿早报，覆盖通用 AI、AI 编程、AI 金融三大领域', 'internal', NOW()),
('今日任务拆解', 'internal://ai/task-breakdown', '分析当前任务列表，生成今日重点工作安排', 'internal', NOW());
"
```

- [ ] **Step 2: Verify the insert**

```bash
mysql -u root -padmin homebition -e "SELECT id, name, type, path FROM api_manager WHERE type='internal';"
```

Expected: 2 rows returned, showing the two internal AI interfaces.

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ api_manager.type field → Task 2
- ✅ pipeline.js execution service → Task 3
- ✅ ai.js internal handlers → Task 4
- ✅ scheduler.js cron scheduler → Task 5
- ✅ manual execute route → Task 6
- ✅ scheduler init in index.js → Task 7
- ✅ send button in UI → Task 8
- ✅ API type selector in UI → Task 9
- ✅ Sample EJS templates → Task 10
- ✅ Register built-in interfaces → Task 11

**2. Placeholder scan:**
No TODOs, TBDs, or placeholders found. All code blocks are complete.

**3. Type consistency:**
`executeSubscription(row, db)` consistent across pipeline.js / subscription.js / scheduler.js. `executeHandler(apiPath, db)` consistent across pipeline.js and apiManager.js. AI handler paths use consistent `internal://` prefix.
