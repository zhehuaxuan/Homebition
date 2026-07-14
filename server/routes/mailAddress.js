const express = require('express');
const router = express.Router();

// 创建邮箱
router.post('/mail/add', async (req, res) => {
    const { name, address, type } = req.body;

    if (!name || !address) {
        return res.status(400).json({ code: 400, message: '名称和地址不能为空' });
    }

    try {
        const sql = `INSERT INTO mail_address (name, address, type, create_time) VALUES (?, ?, ?, NOW())`;
        const [result] = await req.db.query(sql, [name, address, type || 'personal']);

        res.json({ code: 0, message: '创建成功', data: { id: result.insertId } });
    } catch (err) {
        console.error('创建邮箱失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 获取邮箱列表
router.get('/mails', async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM mail_address ORDER BY create_time DESC');
        res.json({ code: 0, data: rows });
    } catch (err) {
        console.error('获取邮箱列表失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 更新邮箱
router.put('/mail/update/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, type } = req.body;

    if (!name || !address) {
        return res.status(400).json({ code: 400, message: '名称和地址不能为空' });
    }

    try {
        const sql = `UPDATE mail_address SET name=?, address=?, type=? WHERE id=?`;
        const [result] = await req.db.query(sql, [name, address, type, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, message: '邮箱不存在' });
        }
        res.json({ code: 0, message: '更新成功' });
    } catch (err) {
        console.error('更新邮箱失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

// 删除邮箱
router.delete('/mail/delete/:id', async (req, res) => {
    try {
        const [mailRows] = await req.db.query('SELECT address FROM mail_address WHERE id = ?', [req.params.id]);
        if (mailRows.length === 0) {
            return res.status(404).json({ code: 404, message: '邮箱不存在' });
        }
        const address = mailRows[0].address;

        const [subs] = await req.db.query('SELECT COUNT(*) as count FROM subscription WHERE email = ?', [address]);
        if (subs[0].count > 0) {
            return res.status(400).json({ code: 400, message: '该邮箱已被订阅任务使用，无法删除' });
        }

        const [result] = await req.db.query('DELETE FROM mail_address WHERE id = ?', [req.params.id]);
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        console.error('删除邮箱失败:', err);
        res.status(500).json({ code: 500, message: '服务器异常' });
    }
});

module.exports = router;
