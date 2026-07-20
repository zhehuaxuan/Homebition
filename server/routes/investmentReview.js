const express = require('express');
const router = express.Router();
const logger = require('../services/logger');
const reviewService = require('../services/investmentReview');

// ======================================
// 复盘 CRUD
// ======================================

// GET /api/invest/review/today — 获取今日行情 + 今日复盘
router.get('/invest/review/today', async (req, res) => {
    try {
        const market = await reviewService.getTodayMarket(req.db);
        const existing = await reviewService.getByDate(req.db, market.date);
        res.json({ code: 0, data: { market, review: existing } });
    } catch (err) {
        logger.error('[investmentReview] 获取今日数据失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// GET /api/invest/review — 获取历史复盘列表
router.get('/invest/review', async (req, res) => {
    try {
        const rows = await reviewService.getList(req.db);
        res.json({ code: 0, data: rows });
    } catch (err) {
        logger.error('[investmentReview] 查询复盘列表失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// GET /api/invest/review/:date — 获取指定日期复盘
router.get('/invest/review/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const row = await reviewService.getByDate(req.db, date);
        if (!row) return res.status(404).json({ code: 404, message: '复盘不存在' });
        res.json({ code: 0, data: row });
    } catch (err) {
        logger.error('[investmentReview] 查询复盘详情失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// PUT /api/invest/review/:date — 新增或更新复盘
router.put('/invest/review/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const reviewData = req.body;
        const result = await reviewService.upsert(req.db, date, reviewData);
        res.json({ code: 0, message: '保存成功', data: result });
    } catch (err) {
        logger.error('[investmentReview] 保存复盘失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// DELETE /api/invest/review/:date — 删除复盘
router.delete('/invest/review/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const deleted = await reviewService.deleteByDate(req.db, date);
        if (!deleted) return res.status(404).json({ code: 404, message: '复盘不存在' });
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        logger.error('[investmentReview] 删除复盘失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 复盘配置 CRUD
// ======================================

// GET /api/review-config/groups — 获取所有配置分组及选项
router.get('/review-config/groups', async (req, res) => {
    try {
        const groups = await reviewService.getConfigGroups(req.db);
        res.json({ code: 0, data: groups });
    } catch (err) {
        logger.error('[reviewConfig] 获取配置分组失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// GET /api/review-config/:groupKey — 获取指定分组选项
router.get('/review-config/:groupKey', async (req, res) => {
    try {
        const { groupKey } = req.params;
        const items = await reviewService.getConfigByGroup(req.db, groupKey);
        res.json({ code: 0, data: items });
    } catch (err) {
        logger.error('[reviewConfig] 获取配置选项失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// PUT /api/review-config/:groupKey — 更新指定分组选项（全量替换）
router.put('/review-config/:groupKey', async (req, res) => {
    try {
        const { groupKey } = req.params;
        const { items } = req.body; // [{ label, value? }]
        await reviewService.updateConfig(req.db, groupKey, items);
        res.json({ code: 0, message: '保存成功' });
    } catch (err) {
        logger.error('[reviewConfig] 更新配置失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 建表初始化
// ======================================
async function initTables(pool) {
    const connection = await pool.getConnection();
    try {
        await connection.query(`CREATE TABLE IF NOT EXISTS investment_review (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            review_date     DATE NOT NULL UNIQUE,
            market_snapshot JSON,
            market_sentiment    VARCHAR(50),
            current_main_line   VARCHAR(100),
            risk_warnings       JSON,
            opportunity_sectors JSON,
            action_plan         VARCHAR(50),
            position_feeling    VARCHAR(50),
            confidence_score    TINYINT,
            free_notes          TEXT,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_date (review_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        await connection.query(`CREATE TABLE IF NOT EXISTS review_config (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            group_key   VARCHAR(50) NOT NULL,
            label       VARCHAR(100) NOT NULL,
            value       VARCHAR(50) DEFAULT NULL,
            sort_order  INT DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_group_label (group_key, label)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        logger.info('[investmentReview] 数据库表已初始化');

        // 迁移：添加 current_main_line 列（兼容旧表）
        try {
            await connection.query('ALTER TABLE investment_review ADD COLUMN current_main_line VARCHAR(100) AFTER market_sentiment');
            logger.info('[investmentReview] 已添加 current_main_line 列');
        } catch (err) {
            if (err.errno !== 1060) throw err;
        }
    } finally {
        connection.release();
    }
}

async function seedDefaultConfig(pool) {
    const inserts = [
        ['market_sentiment', '乐观', null, 1],
        ['market_sentiment', '中性', null, 2],
        ['market_sentiment', '偏谨慎', null, 3],
        ['market_sentiment', '悲观', null, 4],
        ['market_sentiment', '极度风险', null, 5],
        ['current_main_line', 'AI算力', null, 1],
        ['current_main_line', '半导体', null, 2],
        ['current_main_line', '消费电子', null, 3],
        ['current_main_line', '新能源', null, 4],
        ['current_main_line', '创新药', null, 5],
        ['current_main_line', '金融', null, 6],
        ['current_main_line', '军工', null, 7],
        ['current_main_line', '消费', null, 8],
        ['current_main_line', '其他', null, 9],
        ['risk_warning', '大盘风险', null, 1],
        ['risk_warning', '科技回调', null, 2],
        ['risk_warning', '流动性收紧', null, 3],
        ['risk_warning', '政策风险', null, 4],
        ['risk_warning', '外部扰动', null, 5],
        ['opportunity_sector', '创新药', null, 1],
        ['opportunity_sector', '半导体', null, 2],
        ['opportunity_sector', 'AI算力', null, 3],
        ['opportunity_sector', '消费', null, 4],
        ['opportunity_sector', '新能源', null, 5],
        ['opportunity_sector', '金融', null, 6],
        ['opportunity_sector', '其他', null, 7],
        ['action_plan', '加仓', null, 1],
        ['action_plan', '减仓', null, 2],
        ['action_plan', '调仓', null, 3],
        ['action_plan', '观望', null, 4],
        ['action_plan', '小幅试探', null, 5],
        ['position_feeling', '仓位过重', null, 1],
        ['position_feeling', '仓位适中', null, 2],
        ['position_feeling', '仓位偏轻', null, 3],
        ['watchlist', '盐津铺子', 'sz002847', 1],
        ['watchlist', '五洲新春', 'sh603667', 2],
    ];

    for (const [groupKey, label, value, sortOrder] of inserts) {
        await pool.query(
            'INSERT IGNORE INTO review_config (group_key, label, value, sort_order) VALUES (?, ?, ?, ?)',
            [groupKey, label, value, sortOrder]
        );
    }
    logger.info('[investmentReview] 默认配置已初始化');
}

module.exports = router;
module.exports.initTables = initTables;
module.exports.seedDefaultConfig = seedDefaultConfig;
