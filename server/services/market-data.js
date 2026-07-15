// server/services/market-data.js
const axios = require('axios');
const logger = require('./logger');

const GT_URL = 'http://qt.gtimg.cn/q=';

/**
 * Parse a single line from Tencent stock API
 * Format: market~name~code~price~prevClose~open~volume~...~timestamp~change~changePct
 *
 * Key indices (0-based):
 *   1=name, 3=current_price, 4=prev_close, 5=open, 6=volume(手), 7=amount(元)
 *   30=timestamp, 31=change, 32=changePct, 33=high, 34=low
 */
function parseLine(line) {
    // Extract content between quotes
    const m = line.match(/"(.+)"/);
    if (!m) return null;
    const parts = m[1].split('~');
    if (parts.length < 35) return null;

    // Amount: for stocks it's in parts[7], for indices it's embedded in parts[35]
    let amount = parseFloat(parts[7]) || 0;
    if (amount === 0 && parts[35]) {
        const segments = parts[35].split('/');
        if (segments.length >= 3) amount = parseFloat(segments[2]) || 0;
    }

    return {
        code: parts[2] || '',
        name: parts[1] || '',
        price: parseFloat(parts[3]) || 0,
        prevClose: parseFloat(parts[4]) || 0,
        open: parseFloat(parts[5]) || 0,
        volume: parseInt(parts[6]) || 0,        // 手
        amount: amount,                           // 元
        change: parseFloat(parts[31]) || 0,       // 涨跌额
        changePct: parseFloat(parts[32]) || 0,    // 涨跌幅
        high: parseFloat(parts[33]) || 0,
        low: parseFloat(parts[34]) || 0,
        timestamp: parts[30] || ''
    };
}

/**
 * Fetch quotes from Tencent stock API
 * @param {string[]} codes - Stock codes like ['sh000001', 'sz002847']
 * @returns {Promise<Array>}
 */
async function fetchQuotes(codes) {
    if (!codes || codes.length === 0) return [];
    try {
        const resp = await axios.get(GT_URL + codes.join(','), {
            responseType: 'arraybuffer',
            timeout: 8000,
            transformResponse: []
        });
        // Decode GBK as latin1 preserves field separators
        const decoder = new TextDecoder('latin1');
        const text = decoder.decode(resp.data);
        return text.split(';')
            .filter(Boolean)
            .map(parseLine)
            .filter(Boolean);
    } catch (err) {
        logger.warn('[market-data] 获取行情失败: ' + err.message);
        return [];
    }
}

function formatAmount(amount) {
    if (amount >= 1e8) return (amount / 1e8).toFixed(1) + '亿';
    if (amount >= 1e4) return (amount / 1e4).toFixed(1) + '万';
    return Math.round(amount).toString();
}

function formatChangeStr(change, pct) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}（${sign}${pct.toFixed(2)}%）`;
}

/**
 * Get formatted market data for markets and tickers
 * Uses the actual quote timestamp from the API (not current date),
 * so morning subscribers see yesterday's closing data correctly.
 * @param {Array} markets - [{name, code}]
 * @param {Array} tickers - [{name, code}]
 * @returns {Promise<{marketItems: Array, tickerItems: Array}>}
 */
async function getMarketData(markets, tickers) {
    const allMarkets = Array.isArray(markets) ? markets : [];
    const allTickers = Array.isArray(tickers) ? tickers : [];
    const allCodes = [
        ...allMarkets.map(m => m.code),
        ...allTickers.map(t => t.code)
    ].filter(Boolean);

    if (allCodes.length === 0) {
        return { marketItems: [], tickerItems: [] };
    }

    const quotes = await fetchQuotes(allCodes);

    // Build code -> quote map (match both full code like sh000001 and short code like 000001)
    const map = {};
    quotes.forEach(q => {
        if (q && q.code) {
            map[q.code] = q;
            if (/^\d+$/.test(q.code)) {
                map['sh' + q.code] = q;
                map['sz' + q.code] = q;
            }
        }
    });

    // Derive date from the first available quote's timestamp
    // This ensures morning subscribers see yesterday's closing data date correctly
    const firstQuote = quotes.find(q => q && q.timestamp);
    let dataDate;
    if (firstQuote && firstQuote.timestamp) {
        const ts = firstQuote.timestamp.slice(0, 8); // YYYYMMDD
        dataDate = `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}`;
    } else {
        const now = new Date();
        dataDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }

    const marketItems = allMarkets.map(m => {
        const q = map[m.code];
        if (!q || q.price === 0) {
            return { title: m.name, summary: '数据暂不可用', price: 0, change: 0, changePct: 0, quote: null, date: dataDate, source: '' };
        }
        return {
            title: m.name,
            summary: `现价 ${q.price.toFixed(2)} · ${formatChangeStr(q.change, q.changePct)} · 成交 ${formatAmount(q.amount)}`,
            price: q.price,
            change: q.change,
            changePct: q.changePct,
            quote: q,
            date: dataDate,
            source: '腾讯行情'
        };
    });

    const tickerItems = allTickers.map(t => {
        const q = map[t.code];
        if (!q || q.price === 0) {
            return { title: t.name, summary: '数据暂不可用', price: 0, change: 0, changePct: 0, quote: null, date: dataDate, source: '' };
        }
        return {
            title: t.name,
            summary: `现价 ${q.price.toFixed(2)} · ${formatChangeStr(q.change, q.changePct)} · 成交 ${formatAmount(q.amount)}`,
            price: q.price,
            change: q.change,
            changePct: q.changePct,
            quote: q,
            date: dataDate,
            source: '腾讯行情'
        };
    });

    return { marketItems, tickerItems };
}

module.exports = { getMarketData };
