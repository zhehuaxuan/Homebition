// routes/tag.js
const express = require('express');
const router = express.Router();

// ======================================
// 1. 查询所有标签（GET）
// ======================================
router.get('/tags', (req, res) => {
    const sql = 'SELECT * FROM tag ORDER BY create_time DESC';
    req.db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ list: rows });
    });
});

// ======================================
// 2. 新增标签（POST）
// ======================================
router.post('/tag/add', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: '标签名称不能为空' });

    const sql = 'INSERT INTO tag (name) VALUES (?)';
    req.db.run(sql, [name], function (err) {
        if (err) return res.status(500).json({ message: '标签已存在或添加失败' });
        res.json({
            message: '新增成功',
            id: this.lastID,
        });
    });
});

// ======================================
// 3. 删除标签（DELETE）
// ======================================
router.delete('/tag/delete/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM tag WHERE id = ?';

    req.db.run(sql, id, function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.json({ message: '标签不存在' });
        res.json({ message: '删除成功' });
    });
});

// 4. 修改标签 ← 新增的接口
router.put('/tag/update/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: '标签名称不能为空' });
    }

    const sql = 'UPDATE tag SET name = ? WHERE id = ?';
    req.db.run(sql, [name, id], function (err) {
        if (err) {
            return res.status(500).json({ message: '修改失败：' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '标签不存在' });
        }
        res.json({ message: '修改成功' });
    });
});

module.exports = router;