const logger = require('./logger');
const { getMarketData } = require('./market-data');

const INDEX_CODES = [
    { name: '上证指数', code: 'sh000001' },
    { name: '深证成指', code: 'sz399001' },
    { name: '创业板指', code: 'sz399006' },
    { name: '科创板指', code: 'sh000688' }
];

/**
 * 从数据库获取关注个股列表
 */
async function getWatchlist(pool) {
    const [rows] = await pool.query(
        "SELECT label, value FROM review_config WHERE group_key = 'watchlist' ORDER BY sort_order"
    );
    return rows.map(r => ({ name: r.label, code: r.value }));
}

/**
 * 获取今日行情数据
 */
async function getTodayMarket(pool) {
    const tickers = await getWatchlist(pool);
    const { marketItems, tickerItems } = await getMarketData(INDEX_CODES, tickers);

    const shIndex = marketItems.find(m => m.title === '上证指数');
    const szIndex = marketItems.find(m => m.title === '深证成指');
    const shAmount = shIndex?.quote?.amount || 0;
    const szAmount = szIndex?.quote?.amount || 0;
    const totalVolume = shAmount + szAmount;

    const date = marketItems.length > 0
        ? marketItems[0].date
        : new Date().toISOString().slice(0, 10);

    return { date, indices: marketItems, watchlist: tickerItems, totalVolume };
}

/**
 * 获取所有复盘记录
 */
async function getList(pool) {
    const [rows] = await pool.query(
        'SELECT id, review_date, market_sentiment, current_main_line, risk_warnings, opportunity_sectors, action_plan, position_feeling, confidence_score, free_notes, created_at FROM investment_review ORDER BY review_date DESC'
    );
    return rows;
}

/**
 * 获取指定日期复盘
 */
async function getByDate(pool, date) {
    const [rows] = await pool.query('SELECT * FROM investment_review WHERE review_date = ?', [date]);
    return rows[0] || null;
}

/**
 * 插入或更新复盘
 */
async function upsert(pool, date, data) {
    const existing = await getByDate(pool, date);
    const fields = {
        market_snapshot: data.market_snapshot ? JSON.stringify(data.market_snapshot) : null,
        market_sentiment: data.market_sentiment || null,
        current_main_line: data.current_main_line || null,
        risk_warnings: data.risk_warnings ? JSON.stringify(data.risk_warnings) : null,
        opportunity_sectors: data.opportunity_sectors ? JSON.stringify(data.opportunity_sectors) : null,
        action_plan: data.action_plan || null,
        position_feeling: data.position_feeling || null,
        confidence_score: data.confidence_score || null,
        free_notes: data.free_notes || null,
    };

    if (existing) {
        const sql = `UPDATE investment_review SET
            market_snapshot = ?, market_sentiment = ?, current_main_line = ?, risk_warnings = ?,
            opportunity_sectors = ?, action_plan = ?, position_feeling = ?,
            confidence_score = ?, free_notes = ?
            WHERE review_date = ?`;
        await pool.query(sql, [
            fields.market_snapshot, fields.market_sentiment, fields.current_main_line, fields.risk_warnings,
            fields.opportunity_sectors, fields.action_plan, fields.position_feeling,
            fields.confidence_score, fields.free_notes, date
        ]);
        logger.info(`[investmentReview] 更新复盘: ${date}`);
    } else {
        const sql = `INSERT INTO investment_review
            (review_date, market_snapshot, market_sentiment, current_main_line, risk_warnings,
             opportunity_sectors, action_plan, position_feeling, confidence_score, free_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [
            date, fields.market_snapshot, fields.market_sentiment, fields.current_main_line, fields.risk_warnings,
            fields.opportunity_sectors, fields.action_plan, fields.position_feeling,
            fields.confidence_score, fields.free_notes
        ]);
        logger.info(`[investmentReview] 新增复盘: ${date}`);
    }
    return getByDate(pool, date);
}

/**
 * 删除复盘
 */
async function deleteByDate(pool, date) {
    const [result] = await pool.query('DELETE FROM investment_review WHERE review_date = ?', [date]);
    return result.affectedRows > 0;
}

// ======================================
// 配置管理
// ======================================

/**
 * 获取所有配置分组及选项
 */
async function getConfigGroups(pool) {
    const [rows] = await pool.query('SELECT * FROM review_config ORDER BY group_key, sort_order');
    const groups = {};
    for (const row of rows) {
        if (!groups[row.group_key]) groups[row.group_key] = [];
        groups[row.group_key].push({ id: row.id, label: row.label, value: row.value, sortOrder: row.sort_order });
    }
    return Object.entries(groups).map(([key, items]) => ({ groupKey: key, items }));
}

/**
 * 获取指定分组选项
 */
async function getConfigByGroup(pool, groupKey) {
    const [rows] = await pool.query(
        'SELECT id, label, value, sort_order FROM review_config WHERE group_key = ? ORDER BY sort_order',
        [groupKey]
    );
    return rows;
}

/**
 * 更新指定分组的选项（全量替换）
 * items: [{ label, value? }]
 */
async function updateConfig(pool, groupKey, items) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM review_config WHERE group_key = ?', [groupKey]);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await connection.query(
                'INSERT INTO review_config (group_key, label, value, sort_order) VALUES (?, ?, ?, ?)',
                [groupKey, item.label, item.value || null, i + 1]
            );
        }
        await connection.commit();
        logger.info(`[investmentReview] 更新配置分组: ${groupKey}, ${items.length} 项`);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

module.exports = { getTodayMarket, getList, getByDate, upsert, deleteByDate, getConfigGroups, getConfigByGroup, updateConfig };
