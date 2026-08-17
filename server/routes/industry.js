// server/routes/industry.js
const express = require('express');
const router = express.Router();
const logger = require('../services/logger');
const { collectToday } = require('../services/industry');

const SORTABLE = new Set(['changePct', 'change', 'turnoverRate', 'totalMarketCap', 'mainNetInflow', 'upCount']);

// 惰性补采：同一自然日最多一次（防抖在 collectToday 内），并发时共享同一次请求
let lazyLock = null;
let lastLazyNaturalDate = null;

async function lazyCollect(db) {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (lastLazyNaturalDate === today) return;
    if (lazyLock) return lazyLock;
    lazyLock = (async () => {
        try {
            await collectToday(db);
            lastLazyNaturalDate = today;
        } catch (err) {
            logger.warn('[industry] 惰性补采失败（跳过，稍后重试）', { error: err.message });
        } finally {
            lazyLock = null;
        }
    })();
    return lazyLock;
}

// 库中最新交易日
async function getLatestDate(db) {
    const [rows] = await db.query(
        `SELECT DATE_FORMAT(MAX(trade_date), '%Y-%m-%d') AS d FROM industry_quote`
    );
    return rows[0]?.d || null;
}

// 查询指定交易日全板块行情
async function queryByDate(db, targetDate) {
    const [rows] = await db.query(
        `SELECT q.board_code,
                b.code, b.name, b.sw_name,
                DATE_FORMAT(q.trade_date, '%Y-%m-%d') AS trade_date,
                q.close, q.open, q.high, q.low,
                q.change_val, q.change_pct, q.turnover_rate, q.amount,
                q.total_market_cap, q.main_net_inflow, q.up_count, q.down_count,
                q.leader_name, q.leader_code, q.leader_change_pct
         FROM industry_quote q
         LEFT JOIN industry_board b ON b.code = q.board_code
         WHERE q.trade_date = ?
         ORDER BY b.sort_order ASC, q.board_code ASC`,
        [targetDate]
    );
    return rows.map(r => ({
        rank: 0,
        code: r.code || r.board_code,
        name: r.name || r.sw_name || r.board_code,
        swName: r.sw_name,
        tradeDate: r.trade_date,
        price: r.close != null ? Number(r.close) : null,
        open: r.open != null ? Number(r.open) : null,
        high: r.high != null ? Number(r.high) : null,
        low: r.low != null ? Number(r.low) : null,
        change: r.change_val != null ? Number(r.change_val) : null,
        changePct: r.change_pct != null ? Number(r.change_pct) : null,
        turnoverRate: r.turnover_rate != null ? Number(r.turnover_rate) : null,
        amount: r.amount,
        totalMarketCap: r.total_market_cap != null ? Number(r.total_market_cap) : null,
        mainNetInflow: r.main_net_inflow != null ? Number(r.main_net_inflow) : null,
        upCount: r.up_count,
        downCount: r.down_count,
        leaderName: r.leader_name || '',
        leaderCode: r.leader_code || '',
        leaderChangePct: r.leader_change_pct != null ? Number(r.leader_change_pct) : null
    }));
}

// GET /api/invest/industry?date=YYYY-MM-DD&sort=changePct&order=desc
// 不带 date 时：惰性补采后返回最新交易日数据
router.get('/invest/industry', async (req, res) => {
    try {
        const db = req.db;
        let sort = req.query.sort || 'changePct';
        if (!SORTABLE.has(sort)) sort = 'changePct';
        const order = req.query.order === 'asc' ? 1 : -1;

        let targetDate = req.query.date;
        if (targetDate) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                return res.status(400).json({ code: 400, message: '日期格式应为 YYYY-MM-DD' });
            }
        } else {
            await lazyCollect(db);
            targetDate = await getLatestDate(db);
        }

        if (!targetDate) {
            return res.json({ code: 0, data: [], date: null, message: '暂无行情数据' });
        }

        const list = await queryByDate(db, targetDate);

        const sorted = [...list].sort((a, b) => {
            const av = a[sort];
            const bv = b[sort];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return (av - bv) * order;
        });
        sorted.forEach((item, i) => { item.rank = i + 1; });

        res.json({ code: 0, data: sorted, date: targetDate });
    } catch (err) {
        logger.error('[industry] 获取行业板块失败', { error: err.message });
        res.status(500).json({ code: 500, message: '获取行业板块数据失败，请稍后重试' });
    }
});

// GET /api/invest/industry/dates — 库中所有交易日（降序）
router.get('/invest/industry/dates', async (req, res) => {
    try {
        const [rows] = await req.db.query(
            `SELECT DATE_FORMAT(trade_date, '%Y-%m-%d') AS date, COUNT(DISTINCT board_code) AS board_count
             FROM industry_quote
             GROUP BY trade_date
             ORDER BY trade_date DESC`
        );
        res.json({ code: 0, data: rows });
    } catch (err) {
        logger.error('[industry] 获取交易日列表失败', { error: err.message });
        res.status(500).json({ code: 500, message: '获取日期列表失败' });
    }
});

module.exports = router;
