const express = require('express');
const router = express.Router();
const { verifyCompany, evaluateCompany } = require('../services/deepseek');
const fs = require('fs');
const path = require('path');

// 日志文件路径
const LOG_FILE = path.join(__dirname, '../logs/evaluate-error.log');

// 确保日志目录存在
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 写入错误日志
const writeErrorLog = (error, req, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        request: {
            ip: req.ip || req.connection.remoteAddress,
            body: req.body,
            headers: {
                'user-agent': req.get('user-agent')
            }
        },
        context
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine);
    console.error('评估错误已记录到日志:', LOG_FILE);
};

// 简单的内存限流器（每个IP每分钟限制）
const rateLimiter = new Map();
const RATE_LIMIT = 5; // 每分钟最多5次评估
const RATE_WINDOW = 60 * 1000; // 1分钟窗口

const checkRateLimit = (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!rateLimiter.has(ip)) {
        rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    const record = rateLimiter.get(ip);

    // 窗口过期，重置
    if (now > record.resetTime) {
        rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    // 检查是否超限
    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
};

// 清理过期的限流记录（每10分钟）
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimiter.entries()) {
        if (now > record.resetTime) {
            rateLimiter.delete(ip);
        }
    }
}, 10 * 60 * 1000);

// 验证公司接口
router.post('/invest/verify-company', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || !query.trim()) {
            return res.json({
                code: 1,
                msg: '请输入公司名称或代码'
            });
        }

        const result = await verifyCompany(query.trim());

        res.json({
            code: 0,
            data: result
        });
    } catch (error) {
        console.error('验证公司失败:', error);
        res.json({
            code: 1,
            msg: '验证失败，请稍后重试'
        });
    }
});

// 企业评估接口
router.post('/invest/evaluate', async (req, res) => {
    // 防 DDoS 检查
    if (!checkRateLimit(req)) {
        return res.status(429).json({
            code: 429,
            msg: '请求过于频繁，请稍后再试'
        });
    }

    try {
        const { name, code } = req.body;

        if (!name) {
            return res.json({
                code: 1,
                msg: '请提供公司名称'
            });
        }

        const result = await evaluateCompany(name, code || '');

        res.json({
            code: 0,
            data: {
                content: result
            }
        });
    } catch (error) {
        // 记录错误到日志文件
        writeErrorLog(error, req, {
            companyName: req.body.name,
            companyCode: req.body.code,
            resultLength: error.message.includes('maxContentSize') ? '响应体过大' : '未知'
        });

        // 根据错误类型返回不同的提示
        let errorMsg = '评估失败，请稍后重试';
        if (error.message.includes('timeout') || error.code === 'ECONNRESET') {
            errorMsg = '评估超时，请稍后重试';
        } else if (error.message.includes('maxContentSize') || error.message.includes('content too large')) {
            errorMsg = '评估结果过长，请稍后重试';
        }

        res.json({
            code: 1,
            msg: errorMsg
        });
    }
});

module.exports = router;
