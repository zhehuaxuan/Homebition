// server/services/industry.js
// 看行业：行业板块展示同花顺分类（88 开头代码），行情数据用申万行业分类（东方财富数据源）
// 数据落 MySQL：initTables 建表 + collectToday 盘后采集（cron 工作日 15:30 定时入库）
const axios = require('axios');
const cron = require('node-cron');
const logger = require('./logger');
const THS_INDUSTRY = require('../data/ths-industry.json'); // 90 个同花顺行业板块 {code, name}
const SW_MAP = require('../data/sw-map.json'); // 特殊映射：同花顺板块名 -> 申万板块名

const CLIST_URL = 'http://push2delay.eastmoney.com/api/qt/clist/get';
const THS_LINE_URL = 'http://d.10jqka.com.cn/v6/line'; // 同花顺板块日线（免签名，88 代码直出历史）
const FFLOW_URL = 'http://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get'; // 东财板块历史资金流（主力净流入）
const FIELDS = 'f2,f3,f4,f8,f12,f14,f20,f62,f104,f105,f128,f136,f124';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

let collectorStarted = false;
// 惰性补采防抖：同一自然日只补采一次（盘后 cron 用 force 强制采集不受此限制）
let lastCollectNaturalDate = null;

function parseNum(v) {
    if (v === null || v === undefined || v === '-' || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 带并发上限的批量映射
async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) {
            const idx = i++;
            results[idx] = await fn(items[idx], idx);
        }
    });
    await Promise.all(workers);
    return results;
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function dateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
    return dateStr(new Date());
}

function tsToDate(ts) {
    if (!ts) return null;
    return dateStr(new Date(ts * 1000));
}

// 去掉申万板块名的 Ⅰ/Ⅱ/Ⅲ 后缀
function stripSwSuffix(name) {
    return name.replace(/[ⅠⅡⅢ]/g, '').trim();
}

// 申万级别权重：无后缀(一级)=0 < Ⅱ=1 < Ⅲ=2，选宏观代表板块
function swLevel(name) {
    if (name.includes('Ⅲ')) return 2;
    if (name.includes('Ⅱ')) return 1;
    return 0;
}

// 拉取申万行业全量行情
async function fetchSwBoards() {
    let all = [];
    let total = 0;
    let pn = 1;
    while (true) {
        const params = {
            pn, pz: 100, po: 1, np: 1, fltt: 2, invt: 2,
            fid: 'f3',
            ut: 'bd1d9ddb04089700cf9c27f6f7426281',
            fs: 'm:90+t:2+f:!50',
            fields: FIELDS
        };
        const resp = await axios.get(CLIST_URL, {
            params,
            timeout: 10000,
            headers: { 'User-Agent': UA, Referer: 'https://quote.eastmoney.com/' }
        });
        const data = resp.data && resp.data.data;
        const diff = (data && data.diff) || [];
        if (pn === 1) total = (data && data.total) || 0;
        if (diff.length === 0) break;
        all = all.concat(diff);
        if (all.length >= total || all.length >= 600) break;
        pn += 1;
    }
    return all;
}

// 对每个同花顺板块匹配申万板块行情
function matchBoards(swList) {
    // 建立 基础名 -> 候选板块 索引
    const index = {};
    swList.forEach(d => {
        const base = stripSwSuffix(d.f14 || '');
        if (!base) return;
        if (!index[base]) index[base] = [];
        index[base].push(d);
    });

    // 数据批次日期：clist 全量板块同日，取第一个 f124
    const dataTs = swList.find(d => d.f124)?.f124;
    const dataDate = tsToDate(dataTs);

    const list = [];
    THS_INDUSTRY.forEach((b, i) => {
        const swName = SW_MAP[b.name] || b.name;
        const cands = index[swName] || [];
        let match = null;
        if (cands.length > 0) {
            match = cands.sort((a, c) => swLevel(a.f14) - swLevel(c.f14))[0];
        }
        const d = match || {};
        list.push({
            rank: i + 1,
            code: b.code, // 同花顺 88 代码
            name: b.name, // 同花顺板块名
            swName: match ? d.f14 : null, // 申万板块名
            swCode: match ? d.f12 : null, // 申万板块 f12 代码（BKxxxx）
            dataDate,
            price: parseNum(d.f2),
            change: parseNum(d.f4),
            changePct: parseNum(d.f3),
            turnoverRate: parseNum(d.f8),
            totalMarketCap: parseNum(d.f20),
            mainNetInflow: parseNum(d.f62),
            upCount: parseNum(d.f104),
            downCount: parseNum(d.f105),
            leaderName: d.f128 || '',
            leaderCode: d.f140 || '',
            leaderChangePct: parseNum(d.f136),
            matched: !!match
        });
    });
    return list;
}

// 拉取单个同花顺板块日线（免签名），data 为最近约 140 根
// 字段：日期,开,高,低,收,成交量,成交额,振幅,涨跌幅,涨跌额,标志（振幅/涨跌幅/涨跌额为空，需自行计算）
async function fetchThsDaily(code) {
    const url = `${THS_LINE_URL}/bk_${code}/01/last.js`;
    const resp = await axios.get(url, {
        headers: { 'User-Agent': UA },
        timeout: 10000
    });
    const txt = resp.data;
    const start = txt.indexOf('(');
    const end = txt.lastIndexOf(')');
    if (start < 0 || end < 0) throw new Error('同花顺日线响应格式异常');
    const obj = JSON.parse(txt.slice(start + 1, end));
    const parts = String(obj.data || '').split(';').filter(Boolean);
    const list = parts.map(p => {
        const f = p.split(',');
        return {
            tradeDate: `${f[0].slice(0, 4)}-${f[0].slice(4, 6)}-${f[0].slice(6, 8)}`,
            open: parseNum(f[1]),
            high: parseNum(f[2]),
            low: parseNum(f[3]),
            close: parseNum(f[4]),
            amount: parseNum(f[6])
        };
    });
    // 涨跌幅/涨跌额按前一交易日收盘计算
    for (let i = 0; i < list.length; i++) {
        const prevClose = i > 0 ? list[i - 1].close : null;
        if (prevClose != null && list[i].close != null) {
            list[i].change = Number((list[i].close - prevClose).toFixed(3));
            list[i].changePct = prevClose !== 0
                ? Number(((list[i].close - prevClose) / prevClose * 100).toFixed(3))
                : null;
        } else {
            list[i].change = null;
            list[i].changePct = null;
        }
    }
    return list;
}

function upsertQuotes(pool, rows) {
    // rows: [board_code, trade_date, open, close, high, low, change_val, change_pct, turnover_rate, amount]
    return pool.query(
        `INSERT INTO industry_quote
         (board_code, trade_date, open, close, high, low, change_val, change_pct, turnover_rate, amount)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           open=VALUES(open), close=VALUES(close), high=VALUES(high), low=VALUES(low),
           change_val=VALUES(change_val), change_pct=VALUES(change_pct),
           turnover_rate=VALUES(turnover_rate), amount=VALUES(amount)`,
        [rows]
    );
}

// 建表 + 板块表种子
async function initTables(pool) {
    const connection = await pool.getConnection();
    try {
        await connection.query(`CREATE TABLE IF NOT EXISTS industry_board (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            code        VARCHAR(10) NOT NULL UNIQUE,
            name        VARCHAR(50) NOT NULL,
            sw_name     VARCHAR(50),
            sw_code     VARCHAR(10),
            sort_order  INT DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        await connection.query(`CREATE TABLE IF NOT EXISTS industry_quote (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            board_code        VARCHAR(10) NOT NULL,
            trade_date        DATE NOT NULL,
            close             DECIMAL(12,3) NOT NULL,
            open              DECIMAL(12,3) DEFAULT NULL,
            high              DECIMAL(12,3) DEFAULT NULL,
            low               DECIMAL(12,3) DEFAULT NULL,
            change_val        DECIMAL(12,3) DEFAULT NULL,
            change_pct        DECIMAL(8,3) DEFAULT NULL,
            turnover_rate     DECIMAL(8,3) DEFAULT NULL,
            amount            BIGINT DEFAULT NULL,
            total_market_cap  BIGINT DEFAULT NULL,
            main_net_inflow   BIGINT DEFAULT NULL,
            up_count          INT DEFAULT NULL,
            down_count        INT DEFAULT NULL,
            leader_name       VARCHAR(30) DEFAULT NULL,
            leader_code       VARCHAR(10) DEFAULT NULL,
            leader_change_pct DECIMAL(8,3) DEFAULT NULL,
            UNIQUE KEY uk_board_date (board_code, trade_date),
            INDEX idx_date (trade_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        const [rows] = await connection.query('SELECT COUNT(*) AS cnt FROM industry_board');
        if (rows[0].cnt === 0) {
            try {
                const list = matchBoards(await fetchSwBoards());
                const values = list.map(b => [b.code, b.name, b.swName, b.swCode]);
                await connection.query('INSERT INTO industry_board (code, name, sw_name, sw_code) VALUES ?', [values]);
                logger.info(`[industry] 板块表种子完成：${values.length} 条`);
            } catch (err) {
                logger.error('[industry] 板块表种子失败（下次采集重试）', { error: err.message });
            }
        }
        logger.info('[industry] 数据库表已初始化');
    } finally {
        connection.release();
    }
}

// 拉取单个申万板块历史资金流（最近约 120 根），返回 [{tradeDate, mainNetInflow}]
async function fetchFundFlow(swCode) {
    const resp = await axios.get(FFLOW_URL, {
        params: {
            lmt: 0, klt: 101, secid: '90.' + swCode,
            fields1: 'f1,f2,f3,f7',
            fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65'
        },
        headers: { 'User-Agent': UA },
        timeout: 10000
    });
    const d = resp.data && resp.data.data;
    const klines = (d && d.klines) || [];
    return klines.map(line => {
        const p = line.split(',');
        return { tradeDate: p[0], mainNetInflow: parseNum(p[1]) };
    });
}

// 带重试的资金流拉取（push2his 易限流）
async function fetchFundFlowWithRetry(swCode, retries = 3) {
    for (let i = 1; i <= retries; i++) {
        try {
            return await fetchFundFlow(swCode);
        } catch (err) {
            if (i === retries) throw err;
            await sleep(300 * i);
        }
    }
}

// 盘后采集当日全板块快照（含明细字段），幂等 upsert
// force=true 强制采集（盘后 cron）；默认惰性采集，同一自然日只采一次
// 点位口径统一为同花顺板块指数（与历史回填一致），明细字段（总市值/主力净流入/涨跌家数/领涨股）来自申万 clist
async function collectToday(pool, { force = false } = {}) {
    const naturalDate = todayStr();
    if (!force && lastCollectNaturalDate === naturalDate) {
        logger.info('[industry] 今日已采集，跳过重复采集');
        return { skipped: true, date: naturalDate };
    }
    const list = matchBoards(await fetchSwBoards());
    const dataDate = list.find(b => b.dataDate)?.dataDate;
    if (!dataDate) throw new Error('无法确定行情交易日');

    // 并发拉同花顺当日日线，统一当日点位口径；若当日尚无数据（盘中/停更）则退回 clist
    const thsMap = {};
    await mapLimit(THS_INDUSTRY, 5, async (b) => {
        try {
            const klines = await fetchThsDaily(b.code);
            const last = klines[klines.length - 1];
            if (last && last.tradeDate === dataDate) thsMap[b.code] = last;
        } catch (_) { /* 单板块失败不影响整体 */ }
    });

    const rows = [];
    for (const b of list) {
        const ths = thsMap[b.code];
        const close = ths ? ths.close : b.price;
        if (close == null) continue; // 无点位数据的板块跳过（避免 NOT NULL 冲突）
        rows.push([
            b.code, dataDate,
            ths ? ths.open : null, close, ths ? ths.high : null, ths ? ths.low : null,
            ths ? ths.change : b.change, ths ? ths.changePct : b.changePct,
            b.turnoverRate, ths ? ths.amount : null,
            b.totalMarketCap, b.mainNetInflow, b.upCount, b.downCount,
            b.leaderName, b.leaderCode, b.leaderChangePct
        ]);
    }
    await pool.query(
        `INSERT INTO industry_quote
         (board_code, trade_date, open, close, high, low, change_val, change_pct, turnover_rate, amount,
          total_market_cap, main_net_inflow, up_count, down_count, leader_name, leader_code, leader_change_pct)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           close=VALUES(close), change_val=VALUES(change_val), change_pct=VALUES(change_pct),
           turnover_rate=VALUES(turnover_rate), total_market_cap=VALUES(total_market_cap),
           main_net_inflow=VALUES(main_net_inflow), up_count=VALUES(up_count), down_count=VALUES(down_count),
           leader_name=VALUES(leader_name), leader_code=VALUES(leader_code), leader_change_pct=VALUES(leader_change_pct)`,
        [rows]
    );
    lastCollectNaturalDate = naturalDate;
    logger.info(`[industry] 盘后采集完成：${rows.length} 板块，交易日 ${dataDate}`);
    return { date: dataDate, count: rows.length };
}

// 每日盘后定时采集（工作日 15:30）
function initDailyCollector(pool) {
    if (collectorStarted) return;
    cron.schedule('30 15 * * 1-5', async () => {
        try {
            await collectToday(pool, { force: true });
        } catch (err) {
            logger.error('[industry] 盘后定时采集失败', { error: err.message });
        }
    });
    collectorStarted = true;
    logger.info('[industry] 盘后采集定时任务已启动（工作日 15:30）');
}

module.exports = { initTables, collectToday, initDailyCollector };
