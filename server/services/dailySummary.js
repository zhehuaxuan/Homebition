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
