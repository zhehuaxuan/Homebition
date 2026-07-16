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
    const { generateTechNews, generateTaskBreakdown } = require('./ai');

    const handlers = {
        'ai/tech-news': generateTechNews,
        'ai/task-breakdown': generateTaskBreakdown,
        'ai/daily-summary': async (db) => {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            return { date: dateStr };
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

    // 2. Get data from the source
    let data;
    if (api.type === 'internal') {
        logger.info(`[pipeline] 调用内部AI接口: ${api.path}`);
        data = await executeHandler(api.path, db);
    } else {
        logger.info(`[pipeline] 调用外部接口: ${api.path}`);
        data = await executeExternalApi(api.path);
    }

    // 3. Read and render EJS template
    const templatePath = path.join(TEMPLATES_DIR, template);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`模板文件不存在: ${template}`);
    }
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(templateContent, { data });

    // 4. Build subject line
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1+'').padStart(2,'0')}-${(today.getDate()+'').padStart(2,'0')}`;
    const subject = `${name} - ${dateStr}`;

    // 5. Parse recipients and send mail
    const recipients = (() => {
        try {
            const parsed = JSON.parse(email);
            return Array.isArray(parsed) ? parsed.join(', ') : email;
        } catch {
            return email;
        }
    })();
    const { sendMail } = require('./mail');
    await sendMail({
        to: recipients,
        subject,
        html
    });

    // 6. If once type, auto-disable the subscription
    if (type === 'once') {
        await db.query('UPDATE subscription SET status = 0 WHERE id = ?', [id]);
        logger.info(`[pipeline] 一次性任务已完成，已自动停用: ${name}`);
    }

    logger.info(`[pipeline] 订阅任务执行成功: ${name} → ${email}`);
    return { success: true, message: '发送成功' };
}

module.exports = { executeSubscription, executeHandler, executeExternalApi };
