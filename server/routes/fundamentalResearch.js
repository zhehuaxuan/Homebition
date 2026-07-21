const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

/**
 * 版本号推演：V1.0 → V1.1 → ... → V1.9 → V2.0
 */
function nextVersion(current) {
    const match = current.match(/V(\d+)\.(\d+)/);
    if (!match) return 'V1.0';
    let major = parseInt(match[1]);
    let minor = parseInt(match[2]);
    if (minor < 9) {
        minor++;
    } else {
        major++;
        minor = 0;
    }
    return `V${major}.${minor}`;
}

// 确保评分在合理范围内
const safe = (v) => (v != null && !isNaN(v) && isFinite(v)) ? v : null;

// ======================================
// 创建研究记录（从企业评估写入）
// POST /api/invest/research/create
// ======================================
router.post('/invest/research/create', async (req, res) => {
    try {
        const {
            companyName, companyCode,
            totalScore, industryScore, companyScore,
            industryItems, companyItems,
            pros, cons, strategy, summary
        } = req.body;

        if (!companyName) {
            return res.status(400).json({ code: 400, message: '缺少公司名称' });
        }

        // 检查是否已有该公司研究
        const [existing] = await req.db.query(
            'SELECT id, current_version FROM fundamental_research WHERE company_name = ?',
            [companyName]
        );

        let researchId;
        let version;

        if (existing.length > 0) {
            // 已有记录，追加新版本
            researchId = existing[0].id;
            version = nextVersion(existing[0].current_version);
            await req.db.query(
                'UPDATE fundamental_research SET current_version = ? WHERE id = ?',
                [version, researchId]
            );
        } else {
            // 新建研究记录
            version = 'V1.0';
            const [result] = await req.db.query(
                'INSERT INTO fundamental_research (company_name, company_code, current_version) VALUES (?, ?, ?)',
                [companyName, companyCode || '', version]
            );
            researchId = result.insertId;
        }

        // 写入版本记录
        await req.db.query(
            `INSERT INTO fundamental_research_version
                (research_id, version, version_desc, source,
                 company_name, company_code,
                 total_score, industry_score, company_score,
                 industry_items, company_items,
                 pros, cons, target_price, sweet_spot, strategy, summary)
             VALUES (?, ?, ?, 'evaluate',
                     ?, ?,
                     ?, ?, ?,
                     ?, ?,
                     ?, ?, ?, ?, ?, ?)`,
            [
                researchId, version, '从企业评估写入',
                companyName, companyCode || '',
                safe(totalScore), safe(industryScore), safe(companyScore),
                industryItems ? JSON.stringify(industryItems) : null,
                companyItems ? JSON.stringify(companyItems) : null,
                pros ? JSON.stringify(pros) : null,
                cons ? JSON.stringify(cons) : null,
                null, null,
                strategy || null,
                summary || null
            ]
        );

        logger.info(`[fundamentalResearch] 创建研究: ${companyName}, 版本: ${version}`);

        res.json({
            code: 0,
            data: { id: researchId, version, source: 'evaluate' }
        });
    } catch (err) {
        logger.error('[fundamentalResearch] 创建研究失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 手动提交新版本
// POST /api/invest/research/:id/version
// ======================================
router.post('/invest/research/:id/version', async (req, res) => {
    try {
        const { id } = req.params;
        const { versionDesc, pros, cons, strategy, userNotes, industryItems, companyItems, summary, totalScore, industryScore, companyScore, targetPrice, sweetSpot } = req.body;

        // 获取当前研究记录
        const [research] = await req.db.query(
            'SELECT * FROM fundamental_research WHERE id = ?',
            [id]
        );
        if (research.length === 0) {
            return res.status(404).json({ code: 404, message: '研究记录不存在' });
        }

        const record = research[0];
        const newVersion = nextVersion(record.current_version);

        // 获取上一版本的内容作为基础
        const [lastVersion] = await req.db.query(
            'SELECT * FROM fundamental_research_version WHERE research_id = ? AND version = ?',
            [id, record.current_version]
        );

        const prev = lastVersion.length > 0 ? lastVersion[0] : {};

        // 写入新版本
        await req.db.query(
            `INSERT INTO fundamental_research_version
                (research_id, version, version_desc, source,
                 company_name, company_code,
                 total_score, industry_score, company_score,
                 industry_items, company_items,
                 pros, cons, target_price, sweet_spot, strategy, summary, user_notes)
             VALUES (?, ?, ?, 'manual',
                     ?, ?,
                     ?, ?, ?,
                     ?, ?,
                     ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, newVersion, versionDesc || '',
                record.company_name, record.company_code,
                safe(totalScore ?? prev.total_score), safe(industryScore ?? prev.industry_score), safe(companyScore ?? prev.company_score),
                industryItems ? JSON.stringify(industryItems) : prev.industry_items || null,
                companyItems ? JSON.stringify(companyItems) : prev.company_items || null,
                pros ? JSON.stringify(pros) : prev.pros || null,
                cons ? JSON.stringify(cons) : prev.cons || null,
                targetPrice ?? prev.target_price ?? null,
                sweetSpot ?? prev.sweet_spot ?? null,
                strategy || prev.strategy || null,
                summary || prev.summary || null,
                userNotes || prev.user_notes || null
            ]
        );

        // 更新主表当前版本号
        await req.db.query(
            'UPDATE fundamental_research SET current_version = ? WHERE id = ?',
            [newVersion, id]
        );

        logger.info(`[fundamentalResearch] 新增版本: ${record.company_name} ${newVersion}`);

        res.json({
            code: 0,
            data: { id: parseInt(id), version: newVersion, source: 'manual' }
        });
    } catch (err) {
        logger.error('[fundamentalResearch] 提交版本失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 获取研究列表
// GET /api/invest/research
// ======================================
router.get('/invest/research', async (req, res) => {
    try {
        const { keyword } = req.query;
        let sql = `
            SELECT r.id, r.company_name, r.company_code, r.current_version,
                   rv.total_score, rv.pros, rv.cons, r.updated_at
            FROM fundamental_research r
            LEFT JOIN fundamental_research_version rv
                ON rv.research_id = r.id AND rv.version = r.current_version
        `;
        const params = [];

        if (keyword && keyword.trim()) {
            sql += ' WHERE r.company_name LIKE ?';
            params.push(`%${keyword.trim()}%`);
        }

        sql += ' ORDER BY r.updated_at DESC';

        const [rows] = await req.db.query(sql, params);

        // 解析 JSON 字段
        const list = rows.map(row => ({
            id: row.id,
            companyName: row.company_name,
            companyCode: row.company_code,
            currentVersion: row.current_version,
            totalScore: row.total_score,
            pros: row.pros ? (typeof row.pros === 'string' ? JSON.parse(row.pros) : row.pros) : null,
            cons: row.cons ? (typeof row.cons === 'string' ? JSON.parse(row.cons) : row.cons) : null,
            updatedAt: row.updated_at
        }));

        res.json({ code: 0, data: list });
    } catch (err) {
        logger.error('[fundamentalResearch] 查询列表失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 获取研究详情（含版本列表）
// GET /api/invest/research/:id
// ======================================
router.get('/invest/research/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [research] = await req.db.query(
            'SELECT * FROM fundamental_research WHERE id = ?',
            [id]
        );
        if (research.length === 0) {
            return res.status(404).json({ code: 404, message: '研究记录不存在' });
        }

        const record = research[0];

        // 获取所有版本元信息
        const [versions] = await req.db.query(
            `SELECT version, version_desc, source, created_at
             FROM fundamental_research_version
             WHERE research_id = ?
             ORDER BY created_at DESC`,
            [id]
        );

        // 获取当前版本完整内容
        const [currentContent] = await req.db.query(
            'SELECT * FROM fundamental_research_version WHERE research_id = ? AND version = ?',
            [id, record.current_version]
        );

        const content = currentContent.length > 0 ? currentContent[0] : {};

        res.json({
            code: 0,
            data: {
                id: record.id,
                companyName: record.company_name,
                companyCode: record.company_code,
                currentVersion: record.current_version,
                versions: versions.map(v => ({
                    version: v.version,
                    versionDesc: v.version_desc,
                    source: v.source,
                    createdAt: v.created_at
                })),
                content: {
                    totalScore: content.total_score,
                    industryScore: content.industry_score,
                    companyScore: content.company_score,
                    industryItems: content.industry_items
                        ? (typeof content.industry_items === 'string' ? JSON.parse(content.industry_items) : content.industry_items)
                        : null,
                    companyItems: content.company_items
                        ? (typeof content.company_items === 'string' ? JSON.parse(content.company_items) : content.company_items)
                        : null,
                    pros: content.pros
                        ? (typeof content.pros === 'string' ? JSON.parse(content.pros) : content.pros)
                        : null,
                    cons: content.cons
                        ? (typeof content.cons === 'string' ? JSON.parse(content.cons) : content.cons)
                        : null,
                    strategy: content.strategy,
                    targetPrice: content.target_price,
                    sweetSpot: content.sweet_spot,
                    summary: content.summary,
                    userNotes: content.user_notes
                },
                createdAt: record.created_at,
                updatedAt: record.updated_at
            }
        });
    } catch (err) {
        logger.error('[fundamentalResearch] 查询详情失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 获取指定版本内容
// GET /api/invest/research/:id/version/:version
// ======================================
router.get('/invest/research/:id/version/:version', async (req, res) => {
    try {
        const { id, version } = req.params;

        const [rows] = await req.db.query(
            'SELECT * FROM fundamental_research_version WHERE research_id = ? AND version = ?',
            [id, version]
        );

        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '版本不存在' });
        }

        const content = rows[0];

        res.json({
            code: 0,
            data: {
                version: content.version,
                versionDesc: content.version_desc,
                source: content.source,
                createdAt: content.created_at,
                totalScore: content.total_score,
                industryScore: content.industry_score,
                companyScore: content.company_score,
                industryItems: content.industry_items
                    ? (typeof content.industry_items === 'string' ? JSON.parse(content.industry_items) : content.industry_items)
                    : null,
                companyItems: content.company_items
                    ? (typeof content.company_items === 'string' ? JSON.parse(content.company_items) : content.company_items)
                    : null,
                pros: content.pros
                    ? (typeof content.pros === 'string' ? JSON.parse(content.pros) : content.pros)
                    : null,
                cons: content.cons
                    ? (typeof content.cons === 'string' ? JSON.parse(content.cons) : content.cons)
                    : null,
                strategy: content.strategy,
                targetPrice: content.target_price,
                sweetSpot: content.sweet_spot,
                summary: content.summary,
                userNotes: content.user_notes
            }
        });
    } catch (err) {
        logger.error('[fundamentalResearch] 查询版本失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 删除研究记录（含所有版本）
// DELETE /api/invest/research/:id
// ======================================
router.delete('/invest/research/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [research] = await req.db.query('SELECT id FROM fundamental_research WHERE id = ?', [id]);
        if (research.length === 0) {
            return res.status(404).json({ code: 404, message: '研究记录不存在' });
        }

        await req.db.query('DELETE FROM fundamental_research_version WHERE research_id = ?', [id]);
        await req.db.query('DELETE FROM fundamental_research WHERE id = ?', [id]);

        logger.info(`[fundamentalResearch] 删除研究: id=${id}`);
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        logger.error('[fundamentalResearch] 删除研究失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// 建表初始化
// ======================================
async function initTables(pool) {
    const connection = await pool.getConnection();
    try {
        await connection.query(`CREATE TABLE IF NOT EXISTS fundamental_research (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            company_name    VARCHAR(100) NOT NULL,
            company_code    VARCHAR(20) NOT NULL DEFAULT '',
            current_version VARCHAR(10) NOT NULL DEFAULT 'V1.0',
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_company (company_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

        await connection.query(`CREATE TABLE IF NOT EXISTS fundamental_research_version (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            research_id     INT NOT NULL,
            version         VARCHAR(10) NOT NULL,
            version_desc    VARCHAR(500) DEFAULT '',
            source          ENUM('evaluate','manual') NOT NULL,
            company_name    VARCHAR(100),
            company_code    VARCHAR(20),
            total_score     DECIMAL(5,2) DEFAULT NULL,
            industry_score  DECIMAL(5,2) DEFAULT NULL,
            company_score   DECIMAL(5,2) DEFAULT NULL,
            industry_items  JSON DEFAULT NULL,
            company_items   JSON DEFAULT NULL,
            pros            JSON DEFAULT NULL,
            cons            JSON DEFAULT NULL,
            target_price    DECIMAL(10,2) DEFAULT NULL,
            sweet_spot      VARCHAR(100) DEFAULT NULL,
            strategy        TEXT DEFAULT NULL,
            summary         TEXT DEFAULT NULL,
            user_notes      TEXT DEFAULT NULL,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_research_id (research_id),
            INDEX idx_version (research_id, version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

        logger.info('[fundamentalResearch] 数据库表已初始化');

        // 迁移：修复 DECIMAL 精度
        try {
            await connection.query('ALTER TABLE fundamental_research_version MODIFY COLUMN total_score DECIMAL(5,2) DEFAULT NULL');
            await connection.query('ALTER TABLE fundamental_research_version MODIFY COLUMN industry_score DECIMAL(5,2) DEFAULT NULL');
            await connection.query('ALTER TABLE fundamental_research_version MODIFY COLUMN company_score DECIMAL(5,2) DEFAULT NULL');
        } catch (_) { /* 兼容旧表或无变更场景 */ }

        // 迁移：添加 target_price 和 sweet_spot 列
        try {
            await connection.query('ALTER TABLE fundamental_research_version ADD COLUMN target_price DECIMAL(10,2) DEFAULT NULL AFTER cons');
        } catch (_) {}
        try {
            await connection.query('ALTER TABLE fundamental_research_version ADD COLUMN sweet_spot VARCHAR(100) DEFAULT NULL AFTER target_price');
        } catch (_) {}
    } finally {
        connection.release();
    }
}

module.exports = router;
module.exports.initTables = initTables;
