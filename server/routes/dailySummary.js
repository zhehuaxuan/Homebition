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

/**
 * 初始化每日总结的订阅任务（复用订阅系统）
 * 在订阅系统中创建 api_manager 和 subscription 记录
 */
async function initDailySummarySubscription(pool) {
    try {
        // 0. 清理之前错误创建的数据（路径少了 ai/ 前缀导致的问题）
        await pool.query("DELETE FROM subscription WHERE name = '每日总结' AND api_id IN (SELECT id FROM (SELECT id FROM api_manager WHERE path = 'internal://daily-summary') AS tmp)");
        await pool.query("DELETE FROM api_manager WHERE path = 'internal://daily-summary'");

        // 1. 检查/创建 api_manager 记录
        const [apis] = await pool.query("SELECT id FROM api_manager WHERE path = 'internal://ai/daily-summary'");
        let apiId;
        if (apis.length === 0) {
            const [result] = await pool.query(
                "INSERT INTO api_manager (name, path, description, type) VALUES (?, ?, ?, ?)",
                ['每日总结', 'internal://ai/daily-summary', '每日工作日报提醒', 'internal']
            );
            apiId = result.insertId;
            logger.info('[dailySummary] 已创建 api_manager 记录: 每日总结');
        } else {
            apiId = apis[0].id;
        }

        // 2. 检查/创建 subscription 记录
        const adminEmail = process.env.MAIL_USER || 'zhehuaxuan@aliyun.com';
        const [subs] = await pool.query("SELECT id FROM subscription WHERE name = '每日总结'");
        if (subs.length === 0) {
            await pool.query(
                `INSERT INTO subscription (name, type, send_time, week_days, email, template, api_id, status, create_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                ['每日总结', 'periodic', '17:40:00', JSON.stringify([1, 2, 3, 4, 5]),
                 adminEmail, 'daily-summary.ejs', apiId, 1]
            );
            logger.info('[dailySummary] 已创建 subscription 记录: 每日总结 (工作日 17:40)');
        }
    } catch (err) {
        logger.error('[dailySummary] 初始化订阅失败', { error: err.message });
    }
}

module.exports = router;
module.exports.initDailySummaryTable = initDailySummaryTable;
module.exports.initDailySummarySubscription = initDailySummarySubscription;
