// routes/task.js
const express = require('express');
const router = express.Router();

// 查询任务列表
router.get('/tasks', (req, res) => {
  const db = req.db;
  db.all('SELECT * FROM task ORDER BY create_time DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ list: rows });
  });
});

// 新增任务
router.post('/task/add', (req, res) => {
  const { title, target, status } = req.body;
  if (!title) return res.status(400).json({ message: '任务名称不能为空' });

  const sql = `INSERT INTO task (title, target, status) VALUES (?, ?, ?)`;
  req.db.run(sql, [title, target || '', status || 0], function () {
    res.json({ message: '新增成功', id: this.lastID });
  });
});

// 修改任务
router.put('/task/update/:id', (req, res) => {
  const { id } = req.params;
  const { title, target, status } = req.body;

  const sql = `UPDATE task SET title=?, target=?, status=? WHERE id=?`;
  req.db.run(sql, [title, target, status, id], function () {
    res.json({ message: '更新成功' });
  });
});

// 删除任务
router.delete('/task/delete/:id', (req, res) => {
  req.db.run('DELETE FROM task WHERE id=?', req.params.id, () => {
    res.json({ message: '删除成功' });
  });
});

module.exports = router;