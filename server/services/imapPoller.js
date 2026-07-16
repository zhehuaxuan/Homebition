const Imap = require('imap');
const { simpleParser } = require('mailparser');
const logger = require('./logger');

let pollerRunning = false;
let imapInterval = null;

/**
 * 解析邮件正文，提取三段内容
 */
function parseDailyReply(body) {
    // 去除邮件客户端添加的引用原文（只在出现回复引用标记时切）
    const cleanBody = body
        .split(/-----Original Message-----[\s\S]*/)[0]  // Outlook/阿里云回复引用
        .trim();

    // 以三个标题行分割（兼容 emoji 前缀、有无冒号、全角/半角标点）
    const sectionPatterns = [
        { key: 'work_progress', pattern: /[📋]*\s*本日工作任务及进展\s*[:：]?\s*([\s\S]*?)(?=[🎯]*\s*下一步工作内容|$)/ },
        { key: 'next_plan', pattern: /[🎯]*\s*下一步工作内容\s*[:：]?\s*([\s\S]*?)(?=[⚠️]*\s*关键遗留风险项|$)/ },
        { key: 'risk_items', pattern: /[⚠️]*\s*关键遗留风险项\s*[:：]?\s*([\s\S]*?)(?=请您直接回复|系统会自动识别|$)/ }
    ];

    const result = {};
    for (const { key, pattern } of sectionPatterns) {
        const match = cleanBody.match(pattern);
        result[key] = match ? match[1].trim() || null : null;
    }

    return result;
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
async function processEmail(rawSource, pool) {
    try {
        const parsed = await simpleParser(rawSource);
        const subject = parsed.subject || '';
        const from = parsed.from ? parsed.from.text : '';

        // 只处理来自管理员邮箱的回复
        const mailConfig = require('../config/mail');
        const adminEmail = mailConfig.user;
        if (!from.includes(adminEmail)) {
            logger.debug('[imapPoller] 跳过邮件（发件人不匹配）', { from, subject });
            return;
        }

        // 匹配标题: 带回复/转发前缀，内容包含 每日总结 或 Homebition 工作日报 + 日期（排除系统原始发出的邮件）
        // 前缀兼容半角冒号: 和全角冒号：
        const subjectMatch = subject.match(/^(Re\s*[:：]|Fw\s*[:：]|转发\s*[:：]).*(?:每日总结|Homebition 工作日报)\s*[-–—]\s*(\d{4}-\d{2}-\d{2})/i);
        if (!subjectMatch) {
            logger.debug('[imapPoller] 跳过邮件（标题不匹配）', { subject });
            return;
        }

        const date = subjectMatch[2];

        // 优先从 HTML 提取文本（转发邮件时用户内容通常在 HTML 部分）
        let text = parsed.text || '';
        if ((!text || text.trim().length < 50) && parsed.html) {
            text = parsed.html
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        if (!text.trim()) {
            logger.warn(`[imapPoller] 日报回复内容为空: ${date}`);
            return;
        }

        let data = parseDailyReply(text);

        // 如果 text 解析失败，尝试从 HTML 提取文本
        if (!data.work_progress && !data.next_plan && !data.risk_items && parsed.html) {
            const htmlText = parsed.html
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            logger.debug(`[imapPoller] 尝试从 HTML 解析`, { htmlText: htmlText.slice(0, 300) });
            data = parseDailyReply(htmlText);
        }

        // 至少有一个字段不为空才写入
        if (!data.work_progress && !data.next_plan && !data.risk_items) {
            logger.warn(`[imapPoller] 日报回复格式无效，跳过: ${date}`);
            logger.debug(`[imapPoller] 邮件正文预览`, { text: text.slice(0, 200), htmlLength: (parsed.html || '').length });
            return;
        }

        const dailySummary = require('./dailySummary');
        await dailySummary.upsert(pool, date, data);
        logger.info(`[imapPoller] 日报已自动入库: ${date}`);
        logger.info(`[imapPoller] 入库内容详情`, {
            date,
            work_progress: (data.work_progress || '').slice(0, 200),
            next_plan: (data.next_plan || '').slice(0, 200),
            risk_items: (data.risk_items || '').slice(0, 200)
        });
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
        logger.info('[imapPoller] 已连接 IMAP 服务器');
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                logger.error('[imapPoller] 打开收件箱失败', { error: err.message });
                imap.end();
                return;
            }

            // 搜索最近 2 天的邮件（不含 SUBJECT 过滤，避免中文编码问题）
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - 2);

            imap.search([['SINCE', sinceDate]], (searchErr, results) => {
                if (searchErr) {
                    logger.error('[imapPoller] 搜索邮件失败', { error: searchErr.message });
                    imap.end();
                    return;
                }

                if (!results || results.length === 0) {
                    logger.info('[imapPoller] 本次轮询未发现新邮件');
                    imap.end();
                    return;
                }

                logger.info(`[imapPoller] 发现 ${results.length} 封邮件待检查`);

                const fetch = imap.fetch(results, { bodies: '' });
                let processedCount = 0;

                fetch.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        let buffer = '';
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf-8');
                        });
                        stream.on('end', async () => {
                            await processEmail(buffer, pool);
                            processedCount++;
                        });
                    });
                });

                fetch.once('end', () => {
                    // 标记为已读，避免下次重复处理
                    imap.addFlags(results, ['\\Seen'], (flagErr) => {
                        if (flagErr) {
                            logger.warn('[imapPoller] 标记已读失败', { error: flagErr.message });
                        }
                    });
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
        logger.info('[imapPoller] IMAP 连接已断开');
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

    // 从环境变量读取轮询间隔（默认 5 分钟）
    const pollIntervalMin = parseInt(process.env.IMAP_POLL_INTERVAL || '5', 10);
    checkInbox(pool); // 启动时立即检查一次
    imapInterval = setInterval(() => checkInbox(pool), pollIntervalMin * 60 * 1000);
    logger.info(`[imapPoller] 日报邮件轮询服务已启动（每${pollIntervalMin}分钟一次）`);
}

module.exports = { initPoller };
