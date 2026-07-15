const express = require('express');
const router = express.Router();

// 创建订阅任务
router.post('/subscription/add', async (req, res) => {
    const { name, type, send_time, week_days, email, template, api_id, template_data } = req.body;

    if (!name || !type || !email) {
        return res.status(400).json({ code: 400, message: '参数不完整' });
    }

    if (type === 'once' && !send_time) {
        return res.status(400).json({ code: 400, message: '一次性任务需要设置发送时间' });
    }

    if (type === 'periodic' && (!week_days || !week_days.length)) {
        return res.status(400).json({ code: 400, message: '周期性任务需要选择至少一天' });
    }

    if (!template) {
        return res.status(400).json({ code: 400, message: '请选择模板' });
    }

    if (!api_id) {
        return res.status(400).json({ code: 400, message: '请选择接口' });
    }

    try {
        const formattedTime = formatDateTime(send_time);
        const sql = `INSERT INTO subscription (name, type, send_time, week_days, email, template, api_id, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
        const weekDaysStr = JSON.stringify(week_days || []);
        const [result] = await req.db.query(sql, [name, type, formattedTime, weekDaysStr, email, template, api_id, 1]);

        res.json({ code: 0, message: '创建成功', data: { id: result.insertId } });
    } catch (err) {
        console.error('创建订阅任务失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 获取订阅任务列表
router.get('/subscriptions', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM subscription ORDER BY create_time DESC');
        const list = rows.map(item => ({
            ...item,
            week_days: typeof item.week_days === 'string' ? JSON.parse(item.week_days || '[]') : (item.week_days || []),
            email: parseEmails(item.email)
        }));
        res.json({ code: 0, data: list });
    } catch (err) {
        console.error('获取订阅列表失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 获取单个订阅任务
router.get('/subscription/:id', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM subscription WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在' });
        }
        const item = rows[0];
        res.json({
            code: 0,
            data: {
                ...item,
                week_days: typeof item.week_days === 'string' ? JSON.parse(item.week_days || '[]') : (item.week_days || []),
                email: parseEmails(item.email)
            }
        });
    } catch (err) {
        console.error('获取订阅任务失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 更新订阅任务
router.put('/subscription/update/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, send_time, week_days, email, template, api_id, template_data, status } = req.body;

    try {
        const formattedTime = formatDateTime(send_time);
        const weekDaysStr = JSON.stringify(week_days || []);

        const sql = `UPDATE subscription SET name=?, type=?, send_time=?, week_days=?, email=?, template=?, api_id=?, status=? WHERE id=?`;
        const [result] = await req.db.query(sql, [name, type, formattedTime, weekDaysStr, email, template, api_id, status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在' });
        }
        res.json({ code: 0, message: '更新成功' });
    } catch (err) {
        console.error('更新订阅任务失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 删除订阅任务
router.delete('/subscription/delete/:id', async (req, res) => {
    try {
        const [result] = await req.db.query('DELETE FROM subscription WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在' });
        }
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        console.error('删除订阅任务失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 切换订阅任务状态
router.post('/subscription/toggle/:id', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT status FROM subscription WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在' });
        }
        const newStatus = rows[0].status === 1 ? 0 : 1;
        await req.db.query('UPDATE subscription SET status = ? WHERE id = ?', [newStatus, req.params.id]);
        res.json({ code: 0, message: newStatus === 1 ? '已启用' : '已停用' });
    } catch (err) {
        console.error('切换状态失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 辅助函数：解析邮箱字段（兼容 JSON 数组和纯字符串）
function parseEmails(email) {
    if (!email) return email;
    if (Array.isArray(email)) return email;
    try {
        const parsed = JSON.parse(email);
        return Array.isArray(parsed) ? parsed : email;
    } catch {
        return email;
    }
}

// 辅助函数：转换日期格式为 MySQL 格式
function formatDateTime(time) {
    if (!time) return null;
    // Already in MySQL datetime format
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(time)) {
        return time;
    }
    // Time-only format (HH:mm:ss) for periodic tasks — return as-is
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
        return time;
    }
    const date = new Date(time);
    // Guard against Invalid Date (e.g. when time-only string is passed)
    if (isNaN(date.getTime())) {
        return time;
    }
    const y = date.getFullYear();
    const m = (date.getMonth() + 1 + '').padStart(2, '0');
    const d = (date.getDate() + '').padStart(2, '0');
    const h = (date.getHours() + '').padStart(2, '0');
    const min = (date.getMinutes() + '').padStart(2, '0');
    const s = (date.getSeconds() + '').padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

// 手动执行订阅任务
router.post('/subscription/execute/:id', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM subscription WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '任务不存在' });
        }

        const subscription = {
            ...rows[0],
            week_days: typeof rows[0].week_days === 'string'
                ? JSON.parse(rows[0].week_days || '[]')
                : (rows[0].week_days || [])
        };

        const { executeSubscription } = require('../services/pipeline');
        const result = await executeSubscription(subscription, req.db);

        res.json({ code: 0, message: result.message });
    } catch (err) {
        console.error('执行订阅任务失败:', err);
        res.status(500).json({ code: 500, message: err.message || '执行失败' });
    }
});

module.exports = router;
