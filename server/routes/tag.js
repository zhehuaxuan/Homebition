const express = require('express');
const router = express.Router();

// ======================================
// 1. 查询所有标签（GET）
// ======================================
router.get('/tags', async (req, res) => {
    try {
        const sql = 'SELECT * FROM tag ORDER BY create_time DESC';
        const [rows] = await req.db.query(sql);
        res.json({ list: rows });
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message });
    }
});

// ======================================
// 2. 新增标签（POST）
// ======================================
router.post('/tag/add', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: '标签名称不能为空' });

    try {
        const sql = 'INSERT INTO tag (name) VALUES (?)';
        const [result] = await req.db.query(sql, [name]);

        res.json({
            message: '新增成功',
            id: result.insertId,
        });
    } catch (err) {
        res.status(500).json({ message: '标签已存在或添加失败' });
    }
});

// ======================================
// 3. 删除标签（DELETE）
// ======================================
router.delete('/tag/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const sql = 'DELETE FROM tag WHERE id = ?';
        const [result] = await req.db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.json({ message: '标签不存在' });
        }
        res.json({ message: '删除成功' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. 修改标签
router.put('/tag/update/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: '标签名称不能为空' });
    }

    try {
        const sql = 'UPDATE tag SET name = ? WHERE id = ?';
        const [result] = await req.db.query(sql, [name, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '标签不存在' });
        }
        res.json({ message: '修改成功' });
    } catch (err) {
        res.status(500).json({ message: '修改失败：' + err.message });
    }
});

module.exports = router;