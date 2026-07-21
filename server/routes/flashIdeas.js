const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// ======================================
// GET /api/flash-ideas — 获取闪念列表
// ======================================
router.get('/flash-ideas', async (req, res) => {
    try {
        const [rows] = await req.db.query(`
            SELECT f.id, f.content, f.status, f.task_id, f.created_at, f.updated_at,
                   t.title AS task_title, t.status AS task_status
            FROM flash_ideas f
            LEFT JOIN task t ON f.task_id = t.id
            ORDER BY f.created_at DESC
        `);
        // 自动检测：如果关联的任务已完成，状态升为 forest
        const updated = rows.map(row => {
            if (row.task_id && row.task_status === 2 && row.status !== 'forest') {
                req.db.query('UPDATE flash_ideas SET status = ? WHERE id = ?', ['forest', row.id]);
                return { ...row, status: 'forest' };
            }
            return row;
        });
        res.json({ code: 0, data: updated });
    } catch (err) {
        logger.error('[flashIdeas] 查询列表失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// POST /api/flash-ideas — 新建闪念
// ======================================
router.post('/flash-ideas', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ code: 400, message: '内容不能为空' });
        }
        const [result] = await req.db.query(
            'INSERT INTO flash_ideas (content) VALUES (?)',
            [content.trim()]
        );
        const [rows] = await req.db.query('SELECT * FROM flash_ideas WHERE id = ?', [result.insertId]);
        res.json({ code: 0, data: rows[0] });
    } catch (err) {
        logger.error('[flashIdeas] 创建失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// PUT /api/flash-ideas/:id — 更新闪念
// ======================================
router.put('/flash-ideas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, task_id, status } = req.body;

        const [existing] = await req.db.query('SELECT * FROM flash_ideas WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ code: 404, message: '闪念不存在' });
        }

        const updates = [];
        const params = [];
        if (content !== undefined) {
            updates.push('content = ?');
            params.push(content);
        }
        if (task_id !== undefined) {
            updates.push('task_id = ?');
            params.push(task_id || null);
            updates.push('status = ?');
            params.push('tree');
        }
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        if (updates.length === 0) {
            return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
        }

        params.push(id);
        await req.db.query(`UPDATE flash_ideas SET ${updates.join(', ')} WHERE id = ?`, params);

        const [rows] = await req.db.query('SELECT * FROM flash_ideas WHERE id = ?', [id]);
        res.json({ code: 0, data: rows[0] });
    } catch (err) {
        logger.error('[flashIdeas] 更新失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// ======================================
// DELETE /api/flash-ideas/:id — 删除闪念
// ======================================
router.delete('/flash-ideas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await req.db.query('SELECT id FROM flash_ideas WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ code: 404, message: '闪念不存在' });
        }
        await req.db.query('DELETE FROM flash_ideas WHERE id = ?', [id]);
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        logger.error('[flashIdeas] 删除失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

module.exports = router;
